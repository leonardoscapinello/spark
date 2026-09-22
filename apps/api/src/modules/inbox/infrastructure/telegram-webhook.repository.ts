import { Injectable, NotFoundException } from "@nestjs/common";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { contacts, conversations, createAppDbClient, files, identities, integrationConnections, integrationSecrets, messages, withOrgContext, type SparkDb } from "@spark/db";
import { contactId, conversationId, fileId, firstResponseDueAt, identityId, messageId, normalizeIdentityValue, parseTelegramInboundMedia, parseTelegramInboundTexts, type ContactId, type ConversationId, type IntegrationConnectionId, type OrgId, type TelegramInboundMedia } from "@spark/core";
import { DomainEventWriter } from "../../events/application/domain-event-writer.js";
import { SecretVault } from "../../integrations/infrastructure/secret-vault.service.js";
import { InboundMediaStorage } from "./inbound-media-storage.service.js";

const MEDIA_LABEL: Record<TelegramInboundMedia["kind"], string> = { photo: "Imagem", document: "Documento", voice: "Áudio", video: "Vídeo", sticker: "Figurinha" };
const FALLBACK_MIME: Record<TelegramInboundMedia["kind"], string> = { photo: "image/jpeg", document: "application/octet-stream", voice: "audio/ogg", video: "video/mp4", sticker: "image/webp" };

@Injectable()
export class TelegramWebhookRepository {
  private readonly db: SparkDb = createAppDbClient();
  constructor(private readonly vault: SecretVault, private readonly events: DomainEventWriter, private readonly mediaStorage: InboundMediaStorage) {}

  async connection(id: IntegrationConnectionId): Promise<{ orgId: OrgId; secretToken: string; botToken?: string }> {
    // Public webhook bootstrap: resolve only the tenant and provider before entering org context.
    const [route] = await this.db.select({ orgId: integrationConnections.orgId, provider: integrationConnections.provider, status: integrationConnections.status }).from(integrationConnections).where(eq(integrationConnections.id, id)).limit(1);
    if (!route || route.provider !== "telegram" || route.status === "disabled") throw new NotFoundException("Webhook indisponível.");
    const orgId = route.orgId as OrgId;
    const [stored] = await withOrgContext(this.db, orgId, (tx) => tx.select().from(integrationSecrets).where(and(eq(integrationSecrets.orgId, orgId), eq(integrationSecrets.connectionId, id))).limit(1));
    if (!stored) throw new NotFoundException("Webhook não configurado.");
    const secrets = this.vault.decrypt(stored);
    if (!secrets.secretToken) throw new NotFoundException("Webhook não configurado.");
    return { orgId, secretToken: secrets.secretToken, ...(secrets.botToken ? { botToken: secrets.botToken } : {}) };
  }

  async receive(orgId: OrgId, payload: unknown, botToken?: string): Promise<number> {
    let inserted = 0;
    for (const item of parseTelegramInboundTexts(payload)) {
      const added = await this.ingest(orgId, item.externalId, item.senderId, item.occurredAt, async (tx, leadId, threadId) => {
        const [message] = await tx.insert(messages).values({ id: messageId.create(), orgId, conversationId: threadId, contactId: leadId, direction: "inbound", status: "received", body: item.text, externalId: item.externalId, createdAt: item.occurredAt }).onConflictDoNothing().returning({ id: messages.id });
        return message?.id ?? null;
      });
      if (added) inserted += 1;
    }
    for (const item of parseTelegramInboundMedia(payload)) {
      if (!botToken) continue; // sem token não dá pra buscar o binário — a mensagem fica pra trás em vez de derrubar o webhook inteiro.
      const downloaded = await this.downloadMedia(item.fileId, botToken);
      if (!downloaded) continue;
      const added = await this.ingest(orgId, item.externalId, item.senderId, item.occurredAt, async (tx, leadId, threadId) => {
        const newFileId = fileId.create();
        const mimeType = item.mimeType ?? FALLBACK_MIME[item.kind];
        const name = item.filename ?? `${MEDIA_LABEL[item.kind]} do Telegram`;
        const { storageConnectionId, objectKey } = await this.mediaStorage.store(orgId, newFileId, name, mimeType, downloaded.bytes);
        await tx.insert(files).values({ id: newFileId, orgId, storageConnectionId, createdBy: null, name, objectKey, mimeType, sizeBytes: downloaded.bytes.byteLength, status: "ready" });
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
      const externalValue = normalizeIdentityValue("telegram", senderId);
      // The identity and conversation are shared state; serialize concurrent deliveries per sender.
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`${orgId}:telegram:${externalValue}`}, 0))`);
      const [duplicate] = await tx.select({ id: messages.id }).from(messages).where(and(eq(messages.orgId, orgId), eq(messages.externalId, externalId))).limit(1);
      if (duplicate) return false;
      const [identity] = await tx.select({ contactId: identities.contactId }).from(identities).where(and(eq(identities.orgId, orgId), eq(identities.channel, "telegram"), eq(identities.externalValue, externalValue))).limit(1);
      const leadId = (identity?.contactId ?? contactId.create()) as ContactId;
      if (!identity) {
        await tx.insert(contacts).values({ id: leadId, orgId, name: `Telegram ${externalValue}`, source: "telegram" });
        await tx.insert(identities).values({ id: identityId.create(), orgId, contactId: leadId, channel: "telegram", externalValue });
        await this.events.append(tx, { orgId, contactId: leadId as ReturnType<typeof contactId.create>, type: "contact.created", data: { source: "telegram" } });
      }
      const [existing] = await tx.select({ id: conversations.id }).from(conversations).where(and(eq(conversations.orgId, orgId), eq(conversations.contactId, leadId), eq(conversations.channel, "telegram"), inArray(conversations.status, ["open", "snoozed"]))).orderBy(desc(conversations.lastMessageAt)).limit(1);
      const threadId = (existing?.id ?? conversationId.create()) as ConversationId;
      if (!existing) {
        await tx.insert(conversations).values({ id: threadId, orgId, contactId: leadId, channel: "telegram", subject: "Telegram", firstResponseDueAt: new Date(firstResponseDueAt(occurredAt, "normal")), lastMessageAt: occurredAt, createdAt: occurredAt });
        await this.events.append(tx, { orgId, contactId: leadId as ReturnType<typeof contactId.create>, type: "conversation.created", data: { conversationId: threadId, channel: "telegram" } });
      } else {
        await tx.update(conversations).set({ status: "open", snoozedUntil: null, lastMessageAt: occurredAt, updatedAt: new Date() }).where(eq(conversations.id, threadId));
      }
      const insertedId = await insertMessage(tx, leadId, threadId);
      if (!insertedId) return false;
      await this.events.append(tx, { orgId, contactId: leadId as ReturnType<typeof contactId.create>, type: "message.received", data: { conversationId: threadId, messageId: insertedId, channel: "telegram" } });
      return true;
    });
  }

  /** Duas chamadas: o update só traz o file_id, getFile resolve pra um caminho servido por api.telegram.org/file/bot<token>/<path>. */
  private async downloadMedia(fileId_: string, botToken: string): Promise<{ bytes: Buffer } | null> {
    const lookup = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${encodeURIComponent(fileId_)}`);
    if (!lookup.ok) return null;
    const info: unknown = await lookup.json();
    const filePath = info && typeof info === "object" && "result" in info && info.result && typeof info.result === "object" && "file_path" in info.result && typeof (info.result as { file_path: unknown }).file_path === "string" ? (info.result as { file_path: string }).file_path : null;
    if (!filePath) return null;
    const download = await fetch(`https://api.telegram.org/file/bot${botToken}/${filePath}`);
    if (!download.ok) return null;
    return { bytes: Buffer.from(await download.arrayBuffer()) };
  }
}
