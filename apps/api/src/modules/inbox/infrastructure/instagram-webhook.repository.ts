import { Injectable, NotFoundException } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import { files, createAppDbClient, integrationConnectionSettings, integrationConnections, integrationSecrets, messages, withOrgContext, type SparkDb } from "@spark/db";
import { fileId, messageId, normalizeIdentityValue, parseInstagramInboundMedia, parseInstagramInboundTexts, type IntegrationConnectionId, type InstagramInboundMedia, type OrgId } from "@spark/core";
import { SecretVault } from "../../integrations/infrastructure/secret-vault.service.js";
import { InboundMediaStorage } from "./inbound-media-storage.service.js";
import { InboundMessageIngestor } from "./inbound-message-ingestor.service.js";

const MEDIA_LABEL: Record<InstagramInboundMedia["kind"], string> = { image: "Imagem", video: "Vídeo", audio: "Áudio" };
const FALLBACK_MIME: Record<InstagramInboundMedia["kind"], string> = { image: "image/jpeg", video: "video/mp4", audio: "audio/mpeg" };

@Injectable()
export class InstagramWebhookRepository {
  private readonly db: SparkDb = createAppDbClient();
  constructor(private readonly vault: SecretVault, private readonly mediaStorage: InboundMediaStorage, private readonly ingestor: InboundMessageIngestor) {}

  async connection(id: IntegrationConnectionId): Promise<{ orgId: OrgId; appSecret: string; verifyToken: string; accountId?: string }> {
    // Public webhook bootstrap: resolve only the tenant and provider before entering org context.
    const [route] = await this.db.select({ orgId: integrationConnections.orgId, provider: integrationConnections.provider, status: integrationConnections.status }).from(integrationConnections).where(eq(integrationConnections.id, id)).limit(1);
    if (!route || route.provider !== "instagram" || route.status === "disabled") throw new NotFoundException("Webhook indisponível.");
    const orgId = route.orgId as OrgId;
    const [stored] = await withOrgContext(this.db, orgId, (tx) => tx.select().from(integrationSecrets).where(and(eq(integrationSecrets.orgId, orgId), eq(integrationSecrets.connectionId, id))).limit(1));
    if (!stored) throw new NotFoundException("Webhook não configurado.");
    const secrets = this.vault.decrypt(stored);
    // O identificador da conta mora em `integration_connection_settings` (ADR-0035).
    const [setting] = await withOrgContext(this.db, orgId, (tx) => tx.select({ valueText: integrationConnectionSettings.valueText }).from(integrationConnectionSettings).where(and(eq(integrationConnectionSettings.connectionId, id), eq(integrationConnectionSettings.key, "accountId"))).limit(1));
    const accountId = setting?.valueText ?? undefined;
    if (!secrets.appSecret || !secrets.verifyToken) throw new NotFoundException("Webhook não configurado.");
    return { orgId, appSecret: secrets.appSecret, verifyToken: secrets.verifyToken, ...(accountId ? { accountId } : {}) };
  }

  async receive(orgId: OrgId, connectionId: IntegrationConnectionId, payload: unknown, accountId?: string): Promise<number> {
    let inserted = 0;
    for (const item of parseInstagramInboundTexts(payload, accountId)) {
      const added = await this.ingestor.ingest(orgId, {
        channel: "instagram",
        connectionId,
        externalId: item.externalId,
        senderId: item.senderId,
        contactName: `Instagram ${normalizeIdentityValue("instagram", item.senderId)}`,
        conversationSubject: "Instagram Direct",
        occurredAt: item.occurredAt,
        insertMessage: async (tx, leadId, threadId) => {
          const [message] = await tx.insert(messages).values({ id: messageId.create(), orgId, conversationId: threadId, contactId: leadId, direction: "inbound", status: "received", body: item.text, externalId: item.externalId, createdAt: item.occurredAt }).onConflictDoNothing().returning({ id: messages.id });
          return message?.id ?? null;
        },
      });
      if (added) inserted += 1;
    }
    for (const item of parseInstagramInboundMedia(payload, accountId)) {
      const downloaded = await this.downloadMedia(item.url);
      if (!downloaded) continue;
      const added = await this.ingestor.ingest(orgId, {
        channel: "instagram",
        connectionId,
        externalId: item.externalId,
        senderId: item.senderId,
        contactName: `Instagram ${normalizeIdentityValue("instagram", item.senderId)}`,
        conversationSubject: "Instagram Direct",
        occurredAt: item.occurredAt,
        insertMessage: async (tx, leadId, threadId) => {
          const newFileId = fileId.create();
          const mimeType = downloaded.mimeType ?? FALLBACK_MIME[item.kind];
          const { storageConnectionId, objectKey } = await this.mediaStorage.store(orgId, newFileId, `${MEDIA_LABEL[item.kind]} do Instagram`, mimeType, downloaded.bytes);
          await tx.insert(files).values({ id: newFileId, orgId, storageConnectionId, createdBy: null, name: `${MEDIA_LABEL[item.kind]} do Instagram`, objectKey, mimeType, sizeBytes: downloaded.bytes.byteLength, status: "ready" });
          const [message] = await tx.insert(messages).values({ id: messageId.create(), orgId, conversationId: threadId, contactId: leadId, direction: "inbound", status: "received", body: MEDIA_LABEL[item.kind], externalId: item.externalId, attachmentFileId: newFileId, createdAt: item.occurredAt }).onConflictDoNothing().returning({ id: messages.id });
          return message?.id ?? null;
        },
      });
      if (added) inserted += 1;
    }
    return inserted;
  }

  /** Diferente do WhatsApp: o attachment já traz uma URL pronta pra buscar, sem passo de troca de id por URL nem cabeçalho de autorização. */
  private async downloadMedia(url: string): Promise<{ bytes: Buffer; mimeType: string | null } | null> {
    const response = await fetch(url);
    if (!response.ok) return null;
    return { bytes: Buffer.from(await response.arrayBuffer()), mimeType: response.headers.get("content-type") };
  }
}
