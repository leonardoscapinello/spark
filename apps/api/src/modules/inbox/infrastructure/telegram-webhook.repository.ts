import { Injectable, NotFoundException } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import { files, createAppDbClient, integrationConnections, integrationSecrets, messages, withOrgContext, type SparkDb } from "@spark/db";
import { fileId, messageId, normalizeIdentityValue, parseTelegramInboundMedia, parseTelegramInboundTexts, type IntegrationConnectionId, type OrgId, type TelegramInboundMedia } from "@spark/core";
import { SecretVault } from "../../integrations/infrastructure/secret-vault.service.js";
import { InboundMediaStorage } from "./inbound-media-storage.service.js";
import { InboundMessageIngestor } from "./inbound-message-ingestor.service.js";

const MEDIA_LABEL: Record<TelegramInboundMedia["kind"], string> = { photo: "Imagem", document: "Documento", voice: "Áudio", video: "Vídeo", sticker: "Figurinha" };
const FALLBACK_MIME: Record<TelegramInboundMedia["kind"], string> = { photo: "image/jpeg", document: "application/octet-stream", voice: "audio/ogg", video: "video/mp4", sticker: "image/webp" };

@Injectable()
export class TelegramWebhookRepository {
  private readonly db: SparkDb = createAppDbClient();
  constructor(private readonly vault: SecretVault, private readonly mediaStorage: InboundMediaStorage, private readonly ingestor: InboundMessageIngestor) {}

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
      const added = await this.ingestor.ingest(orgId, {
        channel: "telegram",
        externalId: item.externalId,
        senderId: item.senderId,
        contactName: `Telegram ${normalizeIdentityValue("telegram", item.senderId)}`,
        conversationSubject: "Telegram",
        occurredAt: item.occurredAt,
        insertMessage: async (tx, leadId, threadId) => {
          const [message] = await tx.insert(messages).values({ id: messageId.create(), orgId, conversationId: threadId, contactId: leadId, direction: "inbound", status: "received", body: item.text, externalId: item.externalId, createdAt: item.occurredAt }).onConflictDoNothing().returning({ id: messages.id });
          return message?.id ?? null;
        },
      });
      if (added) inserted += 1;
    }
    for (const item of parseTelegramInboundMedia(payload)) {
      if (!botToken) continue; // sem token não dá pra buscar o binário — a mensagem fica pra trás em vez de derrubar o webhook inteiro.
      const downloaded = await this.downloadMedia(item.fileId, botToken);
      if (!downloaded) continue;
      const added = await this.ingestor.ingest(orgId, {
        channel: "telegram",
        externalId: item.externalId,
        senderId: item.senderId,
        contactName: `Telegram ${normalizeIdentityValue("telegram", item.senderId)}`,
        conversationSubject: "Telegram",
        occurredAt: item.occurredAt,
        insertMessage: async (tx, leadId, threadId) => {
          const newFileId = fileId.create();
          const mimeType = item.mimeType ?? FALLBACK_MIME[item.kind];
          const name = item.filename ?? `${MEDIA_LABEL[item.kind]} do Telegram`;
          const { storageConnectionId, objectKey } = await this.mediaStorage.store(orgId, newFileId, name, mimeType, downloaded.bytes);
          await tx.insert(files).values({ id: newFileId, orgId, storageConnectionId, createdBy: null, name, objectKey, mimeType, sizeBytes: downloaded.bytes.byteLength, status: "ready" });
          const [message] = await tx.insert(messages).values({ id: messageId.create(), orgId, conversationId: threadId, contactId: leadId, direction: "inbound", status: "received", body: item.caption ?? MEDIA_LABEL[item.kind], externalId: item.externalId, attachmentFileId: newFileId, createdAt: item.occurredAt }).onConflictDoNothing().returning({ id: messages.id });
          return message?.id ?? null;
        },
      });
      if (added) inserted += 1;
    }
    return inserted;
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
