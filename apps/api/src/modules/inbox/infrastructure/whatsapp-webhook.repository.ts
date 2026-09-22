import { Injectable, NotFoundException } from "@nestjs/common";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { contacts, conversations, createAppDbClient, files, identities, integrationConnectionSettings, integrationConnections, integrationSecrets, messages, withOrgContext, type SparkDb } from "@spark/db";
import { contactId, conversationId, fileId, firstResponseDueAt, identityId, messageId, normalizeIdentityValue, parseWhatsAppInboundMedia, parseWhatsAppInboundTexts, type ContactId, type ConversationId, type IntegrationConnectionId, type OrgId, type WhatsAppInboundMedia } from "@spark/core";
import { DomainEventWriter } from "../../events/application/domain-event-writer.js";
import { SecretVault } from "../../integrations/infrastructure/secret-vault.service.js";
import { InboundMediaStorage } from "./inbound-media-storage.service.js";

const MEDIA_LABEL: Record<WhatsAppInboundMedia["kind"], string> = { image: "Imagem", audio: "Áudio", document: "Documento", video: "Vídeo", sticker: "Figurinha" };
const GRAPH_API_VERSION = "v23.0";

@Injectable()
export class WhatsAppWebhookRepository {
  private readonly db: SparkDb = createAppDbClient();
  constructor(private readonly vault: SecretVault, private readonly events: DomainEventWriter, private readonly mediaStorage: InboundMediaStorage) {}

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

  async receive(orgId: OrgId, payload: unknown, phoneNumberId?: string, accessToken?: string): Promise<number> {
    let inserted = 0;
    for (const item of parseWhatsAppInboundTexts(payload, phoneNumberId)) {
      const added = await this.ingest(orgId, item.externalId, item.senderId, item.occurredAt, async (tx, leadId, threadId) => {
        const [message] = await tx.insert(messages).values({ id: messageId.create(), orgId, conversationId: threadId, contactId: leadId, direction: "inbound", status: "received", body: item.text, externalId: item.externalId, createdAt: item.occurredAt }).onConflictDoNothing().returning({ id: messages.id });
        return message?.id ?? null;
      });
      if (added) inserted += 1;
    }
    for (const item of parseWhatsAppInboundMedia(payload, phoneNumberId)) {
      if (!accessToken) continue; // sem token não dá pra buscar o binário — a mensagem fica pra trás em vez de derrubar o webhook inteiro.
      const downloaded = await this.downloadMedia(item.mediaId, accessToken);
      if (!downloaded) continue;
      const added = await this.ingest(orgId, item.externalId, item.senderId, item.occurredAt, async (tx, leadId, threadId) => {
        const newFileId = fileId.create();
        const { storageConnectionId, objectKey } = await this.mediaStorage.store(orgId, newFileId, item.filename ?? `${item.kind}-${item.mediaId}`, item.mimeType, downloaded.bytes);
        await tx.insert(files).values({ id: newFileId, orgId, storageConnectionId, createdBy: null, name: item.filename ?? `${MEDIA_LABEL[item.kind]} do WhatsApp`, objectKey, mimeType: item.mimeType, sizeBytes: downloaded.bytes.byteLength, status: "ready" });
        const [message] = await tx.insert(messages).values({ id: messageId.create(), orgId, conversationId: threadId, contactId: leadId, direction: "inbound", status: "received", body: item.caption ?? MEDIA_LABEL[item.kind], externalId: item.externalId, attachmentFileId: newFileId, createdAt: item.occurredAt }).onConflictDoNothing().returning({ id: messages.id });
        return message?.id ?? null;
      });
      if (added) inserted += 1;
    }
    return inserted;
  }

  /** Trava a identidade, acha/cria o lead e a conversa, grava a mensagem — igual pra texto e mídia, só o insert da mensagem muda. */
  private async ingest(orgId: OrgId, externalId: string, senderId: string, occurredAt: Date, insertMessage: (tx: SparkDb, leadId: ContactId, threadId: ConversationId) => Promise<string | null>): Promise<boolean> {
    return withOrgContext(this.db, orgId, async (tx) => {
      const externalValue = normalizeIdentityValue("whatsapp", senderId);
      // The identity and conversation are shared state; serialize concurrent deliveries per sender.
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`${orgId}:whatsapp:${externalValue}`}, 0))`);
      const [duplicate] = await tx.select({ id: messages.id }).from(messages).where(and(eq(messages.orgId, orgId), eq(messages.externalId, externalId))).limit(1);
      if (duplicate) return false;
      const [identity] = await tx.select({ contactId: identities.contactId }).from(identities).where(and(eq(identities.orgId, orgId), eq(identities.channel, "whatsapp"), eq(identities.externalValue, externalValue))).limit(1);
      const leadId = (identity?.contactId ?? contactId.create()) as ContactId;
      if (!identity) {
        await tx.insert(contacts).values({ id: leadId, orgId, name: `WhatsApp ${externalValue}`, phone: externalValue, source: "whatsapp" });
        await tx.insert(identities).values({ id: identityId.create(), orgId, contactId: leadId, channel: "whatsapp", externalValue });
        await this.events.append(tx, { orgId, contactId: leadId as ReturnType<typeof contactId.create>, type: "contact.created", data: { source: "whatsapp" } });
      }
      const [existing] = await tx.select({ id: conversations.id }).from(conversations).where(and(eq(conversations.orgId, orgId), eq(conversations.contactId, leadId), eq(conversations.channel, "whatsapp"), inArray(conversations.status, ["open", "snoozed"]))).orderBy(desc(conversations.lastMessageAt)).limit(1);
      const threadId = (existing?.id ?? conversationId.create()) as ConversationId;
      if (!existing) {
        await tx.insert(conversations).values({ id: threadId, orgId, contactId: leadId, channel: "whatsapp", subject: "WhatsApp", firstResponseDueAt: new Date(firstResponseDueAt(occurredAt, "normal")), lastMessageAt: occurredAt, createdAt: occurredAt });
        await this.events.append(tx, { orgId, contactId: leadId as ReturnType<typeof contactId.create>, type: "conversation.created", data: { conversationId: threadId, channel: "whatsapp" } });
      } else {
        await tx.update(conversations).set({ status: "open", snoozedUntil: null, lastMessageAt: occurredAt, updatedAt: new Date() }).where(eq(conversations.id, threadId));
      }
      const insertedId = await insertMessage(tx, leadId, threadId);
      if (!insertedId) return false;
      await this.events.append(tx, { orgId, contactId: leadId as ReturnType<typeof contactId.create>, type: "message.received", data: { conversationId: threadId, messageId: insertedId, channel: "whatsapp" } });
      return true;
    });
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
