import { Injectable, NotFoundException } from "@nestjs/common";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { contacts, conversations, createAppDbClient, files, identities, integrationConnectionSettings, integrationConnections, integrationSecrets, messages, withOrgContext, type SparkDb } from "@spark/db";
import { contactId, conversationId, fileId, firstResponseDueAt, identityId, messageId, normalizeIdentityValue, parseMessengerInboundMedia, parseMessengerInboundTexts, type ContactId, type ConversationId, type IntegrationConnectionId, type MessengerInboundMedia, type OrgId } from "@spark/core";
import { DomainEventWriter } from "../../events/application/domain-event-writer.js";
import { SecretVault } from "../../integrations/infrastructure/secret-vault.service.js";
import { InboundMediaStorage } from "./inbound-media-storage.service.js";

const MEDIA_LABEL: Record<MessengerInboundMedia["kind"], string> = { image: "Imagem", video: "Vídeo", audio: "Áudio", file: "Arquivo" };
const FALLBACK_MIME: Record<MessengerInboundMedia["kind"], string> = { image: "image/jpeg", video: "video/mp4", audio: "audio/mpeg", file: "application/octet-stream" };

@Injectable()
export class MessengerWebhookRepository {
  private readonly db: SparkDb = createAppDbClient();
  constructor(private readonly vault: SecretVault, private readonly events: DomainEventWriter, private readonly mediaStorage: InboundMediaStorage) {}

  async connection(id: IntegrationConnectionId): Promise<{ orgId: OrgId; appSecret: string; verifyToken: string; pageId?: string }> {
    // Public webhook bootstrap: resolve only the tenant and provider before entering org context.
    const [route] = await this.db.select({ orgId: integrationConnections.orgId, provider: integrationConnections.provider, status: integrationConnections.status }).from(integrationConnections).where(eq(integrationConnections.id, id)).limit(1);
    if (!route || route.provider !== "messenger" || route.status === "disabled") throw new NotFoundException("Webhook indisponível.");
    const orgId = route.orgId as OrgId;
    const [stored] = await withOrgContext(this.db, orgId, (tx) => tx.select().from(integrationSecrets).where(and(eq(integrationSecrets.orgId, orgId), eq(integrationSecrets.connectionId, id))).limit(1));
    if (!stored) throw new NotFoundException("Webhook não configurado.");
    const secrets = this.vault.decrypt(stored);
    // O identificador da página mora em `integration_connection_settings` (ADR-0035).
    const [setting] = await withOrgContext(this.db, orgId, (tx) => tx.select({ valueText: integrationConnectionSettings.valueText }).from(integrationConnectionSettings).where(and(eq(integrationConnectionSettings.connectionId, id), eq(integrationConnectionSettings.key, "pageId"))).limit(1));
    const pageId = setting?.valueText ?? undefined;
    if (!secrets.appSecret || !secrets.verifyToken) throw new NotFoundException("Webhook não configurado.");
    return { orgId, appSecret: secrets.appSecret, verifyToken: secrets.verifyToken, ...(pageId ? { pageId } : {}) };
  }

  async receive(orgId: OrgId, payload: unknown, pageId?: string): Promise<number> {
    let inserted = 0;
    for (const item of parseMessengerInboundTexts(payload, pageId)) {
      const added = await this.ingest(orgId, item.externalId, item.senderId, item.occurredAt, async (tx, leadId, threadId) => {
        const [message] = await tx.insert(messages).values({ id: messageId.create(), orgId, conversationId: threadId, contactId: leadId, direction: "inbound", status: "received", body: item.text, externalId: item.externalId, createdAt: item.occurredAt }).onConflictDoNothing().returning({ id: messages.id });
        return message?.id ?? null;
      });
      if (added) inserted += 1;
    }
    for (const item of parseMessengerInboundMedia(payload, pageId)) {
      const downloaded = await this.downloadMedia(item.url);
      if (!downloaded) continue;
      const added = await this.ingest(orgId, item.externalId, item.senderId, item.occurredAt, async (tx, leadId, threadId) => {
        const newFileId = fileId.create();
        const mimeType = downloaded.mimeType ?? FALLBACK_MIME[item.kind];
        const { storageConnectionId, objectKey } = await this.mediaStorage.store(orgId, newFileId, `${MEDIA_LABEL[item.kind]} do Messenger`, mimeType, downloaded.bytes);
        await tx.insert(files).values({ id: newFileId, orgId, storageConnectionId, createdBy: null, name: `${MEDIA_LABEL[item.kind]} do Messenger`, objectKey, mimeType, sizeBytes: downloaded.bytes.byteLength, status: "ready" });
        const [message] = await tx.insert(messages).values({ id: messageId.create(), orgId, conversationId: threadId, contactId: leadId, direction: "inbound", status: "received", body: MEDIA_LABEL[item.kind], externalId: item.externalId, attachmentFileId: newFileId, createdAt: item.occurredAt }).onConflictDoNothing().returning({ id: messages.id });
        return message?.id ?? null;
      });
      if (added) inserted += 1;
    }
    return inserted;
  }

  /** Trava a identidade, acha/cria o lead e a conversa, grava a mensagem — igual pra texto e mídia, só o insert da mensagem muda. */
  private async ingest(orgId: OrgId, externalId: string, senderId: string, occurredAt: Date, insertMessage: (tx: SparkDb, leadId: ContactId, threadId: ConversationId) => Promise<string | null>): Promise<boolean> {
    return withOrgContext(this.db, orgId, async (tx) => {
      const externalValue = normalizeIdentityValue("messenger", senderId);
      // The identity and conversation are shared state; serialize concurrent deliveries per sender.
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`${orgId}:messenger:${externalValue}`}, 0))`);
      const [duplicate] = await tx.select({ id: messages.id }).from(messages).where(and(eq(messages.orgId, orgId), eq(messages.externalId, externalId))).limit(1);
      if (duplicate) return false;
      const [identity] = await tx.select({ contactId: identities.contactId }).from(identities).where(and(eq(identities.orgId, orgId), eq(identities.channel, "messenger"), eq(identities.externalValue, externalValue))).limit(1);
      const leadId = (identity?.contactId ?? contactId.create()) as ContactId;
      if (!identity) {
        await tx.insert(contacts).values({ id: leadId, orgId, name: `Messenger ${externalValue}`, source: "messenger" });
        await tx.insert(identities).values({ id: identityId.create(), orgId, contactId: leadId, channel: "messenger", externalValue });
        await this.events.append(tx, { orgId, contactId: leadId as ReturnType<typeof contactId.create>, type: "contact.created", data: { source: "messenger" } });
      }
      const [existing] = await tx.select({ id: conversations.id }).from(conversations).where(and(eq(conversations.orgId, orgId), eq(conversations.contactId, leadId), eq(conversations.channel, "messenger"), inArray(conversations.status, ["open", "snoozed"]))).orderBy(desc(conversations.lastMessageAt)).limit(1);
      const threadId = (existing?.id ?? conversationId.create()) as ConversationId;
      if (!existing) {
        await tx.insert(conversations).values({ id: threadId, orgId, contactId: leadId, channel: "messenger", subject: "Messenger", firstResponseDueAt: new Date(firstResponseDueAt(occurredAt, "normal")), lastMessageAt: occurredAt, createdAt: occurredAt });
        await this.events.append(tx, { orgId, contactId: leadId as ReturnType<typeof contactId.create>, type: "conversation.created", data: { conversationId: threadId, channel: "messenger" } });
      } else {
        await tx.update(conversations).set({ status: "open", snoozedUntil: null, lastMessageAt: occurredAt, updatedAt: new Date() }).where(eq(conversations.id, threadId));
      }
      const insertedId = await insertMessage(tx, leadId, threadId);
      if (!insertedId) return false;
      await this.events.append(tx, { orgId, contactId: leadId as ReturnType<typeof contactId.create>, type: "message.received", data: { conversationId: threadId, messageId: insertedId, channel: "messenger" } });
      return true;
    });
  }

  /** Igual ao Instagram: o attachment já traz uma URL pronta, sem passo de troca de id por URL. */
  private async downloadMedia(url: string): Promise<{ bytes: Buffer; mimeType: string | null } | null> {
    const response = await fetch(url);
    if (!response.ok) return null;
    return { bytes: Buffer.from(await response.arrayBuffer()), mimeType: response.headers.get("content-type") };
  }
}
