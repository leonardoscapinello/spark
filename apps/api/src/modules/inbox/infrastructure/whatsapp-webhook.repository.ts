import { Injectable, NotFoundException } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import { files, createAppDbClient, integrationConnectionSettings, integrationConnections, integrationSecrets, messages, withOrgContext, type SparkDb } from "@spark/db";
import { fileId, messageId, normalizeIdentityValue, parseWhatsAppInboundMedia, parseWhatsAppInboundTexts, type IntegrationConnectionId, type OrgId, type WhatsAppInboundMedia } from "@spark/core";
import { SecretVault } from "../../integrations/infrastructure/secret-vault.service.js";
import { InboundMediaStorage } from "./inbound-media-storage.service.js";
import { InboundMessageIngestor } from "./inbound-message-ingestor.service.js";

const MEDIA_LABEL: Record<WhatsAppInboundMedia["kind"], string> = { image: "Imagem", audio: "Áudio", document: "Documento", video: "Vídeo", sticker: "Figurinha" };
const GRAPH_API_VERSION = "v23.0";

@Injectable()
export class WhatsAppWebhookRepository {
  private readonly db: SparkDb = createAppDbClient();
  constructor(private readonly vault: SecretVault, private readonly mediaStorage: InboundMediaStorage, private readonly ingestor: InboundMessageIngestor) {}

  async connection(id: IntegrationConnectionId): Promise<{ orgId: OrgId; appSecret: string; verifyToken: string; accessToken?: string; phoneNumberId?: string }> {
    // Public webhook bootstrap: resolve only the tenant and provider before entering org context.
    const [route] = await this.db.select({ orgId: integrationConnections.orgId, provider: integrationConnections.provider, status: integrationConnections.status }).from(integrationConnections).where(eq(integrationConnections.id, id)).limit(1);
    if (!route || route.provider !== "whatsapp" || route.status === "disabled") throw new NotFoundException("Webhook indisponível.");
    const orgId = route.orgId as OrgId;
    const [stored] = await withOrgContext(this.db, orgId, (tx) => tx.select().from(integrationSecrets).where(and(eq(integrationSecrets.orgId, orgId), eq(integrationSecrets.connectionId, id))).limit(1));
    if (!stored) throw new NotFoundException("Webhook não configurado.");
    const secrets = this.vault.decrypt(stored);
    // O identificador do número mora em `integration_connection_settings` (ADR-0035).
    const [setting] = await withOrgContext(this.db, orgId, (tx) => tx.select({ valueText: integrationConnectionSettings.valueText }).from(integrationConnectionSettings).where(and(eq(integrationConnectionSettings.connectionId, id), eq(integrationConnectionSettings.key, "phoneNumberId"))).limit(1));
    const phoneNumberId = setting?.valueText ?? undefined;
    if (!secrets.appSecret || !secrets.verifyToken) throw new NotFoundException("Webhook não configurado.");
    return { orgId, appSecret: secrets.appSecret, verifyToken: secrets.verifyToken, ...(secrets.accessToken ? { accessToken: secrets.accessToken } : {}), ...(phoneNumberId ? { phoneNumberId } : {}) };
  }

  async receive(orgId: OrgId, connectionId: IntegrationConnectionId, payload: unknown, phoneNumberId?: string, accessToken?: string): Promise<number> {
    let inserted = 0;
    for (const item of parseWhatsAppInboundTexts(payload, phoneNumberId)) {
      const added = await this.ingestor.ingest(orgId, {
        channel: "whatsapp",
        connectionId,
        externalId: item.externalId,
        senderId: item.senderId,
        contactName: `WhatsApp ${normalizeIdentityValue("whatsapp", item.senderId)}`,
        setContactPhone: true,
        conversationSubject: "WhatsApp",
        occurredAt: item.occurredAt,
        insertMessage: async (tx, leadId, threadId) => {
          const [message] = await tx.insert(messages).values({ id: messageId.create(), orgId, conversationId: threadId, contactId: leadId, direction: "inbound", status: "received", body: item.text, externalId: item.externalId, createdAt: item.occurredAt }).onConflictDoNothing().returning({ id: messages.id });
          return message?.id ?? null;
        },
      });
      if (added) inserted += 1;
    }
    for (const item of parseWhatsAppInboundMedia(payload, phoneNumberId)) {
      if (!accessToken) continue; // sem token não dá pra buscar o binário — a mensagem fica pra trás em vez de derrubar o webhook inteiro.
      const downloaded = await this.downloadMedia(item.mediaId, accessToken);
      if (!downloaded) continue;
      const added = await this.ingestor.ingest(orgId, {
        channel: "whatsapp",
        connectionId,
        externalId: item.externalId,
        senderId: item.senderId,
        contactName: `WhatsApp ${normalizeIdentityValue("whatsapp", item.senderId)}`,
        setContactPhone: true,
        conversationSubject: "WhatsApp",
        occurredAt: item.occurredAt,
        insertMessage: async (tx, leadId, threadId) => {
          const newFileId = fileId.create();
          const { storageConnectionId, objectKey } = await this.mediaStorage.store(orgId, newFileId, item.filename ?? `${MEDIA_LABEL[item.kind]} do WhatsApp`, item.mimeType, downloaded.bytes);
          await tx.insert(files).values({ id: newFileId, orgId, storageConnectionId, createdBy: null, name: item.filename ?? `${MEDIA_LABEL[item.kind]} do WhatsApp`, objectKey, mimeType: item.mimeType, sizeBytes: downloaded.bytes.byteLength, status: "ready" });
          const [message] = await tx.insert(messages).values({ id: messageId.create(), orgId, conversationId: threadId, contactId: leadId, direction: "inbound", status: "received", body: item.caption ?? MEDIA_LABEL[item.kind], externalId: item.externalId, attachmentFileId: newFileId, createdAt: item.occurredAt }).onConflictDoNothing().returning({ id: messages.id });
          return message?.id ?? null;
        },
      });
      if (added) inserted += 1;
    }
    return inserted;
  }

  /** Duas chamadas: o webhook só traz o id da mídia, a Cloud API resolve pra uma URL temporária que expira em minutos. */
  private async downloadMedia(mediaId: string, accessToken: string): Promise<{ bytes: Buffer } | null> {
    const lookup = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${encodeURIComponent(mediaId)}`, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!lookup.ok) return null;
    const info: unknown = await lookup.json();
    const url = info && typeof info === "object" && "url" in info && typeof (info as { url: unknown }).url === "string" ? (info as { url: string }).url : null;
    if (!url) return null;
    const download = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!download.ok) return null;
    return { bytes: Buffer.from(await download.arrayBuffer()) };
  }
}
