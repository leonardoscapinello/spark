import { BadRequestException, Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { and, desc, eq, inArray } from "drizzle-orm";
import { contacts, createAppDbClient, files, identities, integrationConnections, integrationSecrets, withOrgContext, type SparkDb } from "@spark/db";
import type { ContactId, ConversationChannel, FileId, IntegrationConnectionId, OrgId, SendTemplate } from "@spark/core";
import { SecretVault } from "../../integrations/infrastructure/secret-vault.service.js";
import { ConnectionSettingsRepository } from "../../integrations/infrastructure/connection-settings.repository.js";
import { EmailDeliveryService } from "../../integrations/application/email-delivery.service.js";
import { StorageResolver } from "../../files/infrastructure/storage-resolver.service.js";

interface Attachment { url: string; mimeType: string; name: string; }

@Injectable()
export class ChannelSender {
  private readonly db: SparkDb = createAppDbClient();
  constructor(private readonly vault: SecretVault, private readonly email: EmailDeliveryService, private readonly settings: ConnectionSettingsRepository, private readonly storage: StorageResolver) {}

  async send(orgId: OrgId, contactId: ContactId, channel: ConversationChannel, subject: string, body: string, attachmentFileId?: FileId | null, connectionId?: IntegrationConnectionId | null, template?: SendTemplate | null): Promise<string> {
    if (channel !== "email" && channel !== "instagram" && channel !== "whatsapp" && channel !== "messenger" && channel !== "telegram" && channel !== "widget") throw new BadRequestException(`O canal ${channel} ainda não aceita respostas externas.`);
    if (template && channel !== "whatsapp") throw new BadRequestException("Modelo pré-aprovado só existe no WhatsApp.");
    // O widget não tem API externa pra entregar — a mensagem já foi persistida pelo chamador, e o visitante lê por polling em /v1/public/widget.
    if (channel === "widget") return crypto.randomUUID();
    const [loaded, attachment] = await Promise.all([
      withOrgContext(this.db, orgId, async (tx) => {
        // A conversa já sabe por qual das nossas conexões (ex: qual número de WhatsApp) o cliente escreveu — responde por ela mesma, não "a mais recente".
        const providers = channel === "email" ? ["google_workspace", "smtp"] : [channel];
        const scope = connectionId ? and(eq(integrationConnections.orgId, orgId), eq(integrationConnections.id, connectionId), eq(integrationConnections.status, "connected")) : and(eq(integrationConnections.orgId, orgId), inArray(integrationConnections.provider, providers), eq(integrationConnections.status, "connected"));
        const [connection] = await tx.select().from(integrationConnections).where(scope).orderBy(desc(integrationConnections.updatedAt)).limit(1);
        if (!connection) throw new ServiceUnavailableException(`Nenhuma integração conectada para ${channel}.`);
        const [secret] = await tx.select().from(integrationSecrets).where(and(eq(integrationSecrets.connectionId, connection.id), eq(integrationSecrets.orgId, orgId))).limit(1);
        if (!secret) throw new ServiceUnavailableException("Credenciais do canal indisponíveis.");
        const [contact] = await tx.select({ email: contacts.email }).from(contacts).where(and(eq(contacts.id, contactId), eq(contacts.orgId, orgId))).limit(1);
        const [identity] = await tx.select({ externalValue: identities.externalValue }).from(identities).where(and(eq(identities.contactId, contactId), eq(identities.orgId, orgId), eq(identities.channel, channel))).limit(1);
        // A configuração vem de `integration_connection_settings` (ADR-0035).
        return { connection, config: await this.settings.read(tx, connection.id), credentials: this.vault.decrypt(secret), recipient: channel === "email" ? contact?.email ?? identity?.externalValue : identity?.externalValue };
      }),
      attachmentFileId ? this.resolveAttachment(orgId, attachmentFileId) : Promise.resolve(undefined),
    ]);
    if (!loaded.recipient) throw new BadRequestException(`O contato não possui identidade ${channel}.`);
    if (loaded.connection.provider === "smtp" || loaded.connection.provider === "google_workspace") return this.email.send(orgId, { to: loaded.recipient, subject, text: body, ...(attachment ? { attachment } : {}) });
    if (loaded.connection.provider === "whatsapp") return this.whatsapp(loaded.config, loaded.credentials, loaded.recipient, body, attachment, template);
    if (loaded.connection.provider === "telegram") return this.telegram(loaded.credentials, loaded.recipient, body, attachment);
    if (loaded.connection.provider === "messenger") return this.metaSend(text(loaded.config.pageId), text(loaded.config.apiVersion), loaded.credentials, loaded.recipient, body, "Messenger", attachment);
    return this.metaSend(text(loaded.config.accountId), text(loaded.config.apiVersion), loaded.credentials, loaded.recipient, body, "Instagram", attachment);
  }

  /** A mesma URL assinada que a tela usa pra baixar o anexo — os canais buscam o binário por conta própria a partir dela. */
  private async resolveAttachment(orgId: OrgId, fileId: FileId): Promise<Attachment> {
    const row = await withOrgContext(this.db, orgId, (tx) => tx.select().from(files).where(and(eq(files.id, fileId), eq(files.orgId, orgId), eq(files.status, "ready"))).limit(1)).then((rows) => rows[0]);
    if (!row) throw new NotFoundException("Anexo não encontrado.");
    const storage = await this.storage.byConnection(orgId, row.storageConnectionId as Parameters<StorageResolver["byConnection"]>[1]);
    const target = await storage.createDownload(orgId, row.objectKey);
    return { url: target.downloadUrl, mimeType: row.mimeType, name: row.name };
  }

  private async telegram(credentials: Record<string, string>, recipient: string, body: string, attachment?: Attachment): Promise<string> {
    if (!credentials.botToken) throw new ServiceUnavailableException("Token do Telegram indisponível.");
    const mediaMethods = { image: ["sendPhoto", "photo"], video: ["sendVideo", "video"], audio: ["sendAudio", "audio"], document: ["sendDocument", "document"] } as const;
    const kind = attachment ? whatsappMessageType(attachment.mimeType) : null;
    const [method, mediaField] = kind ? mediaMethods[kind] : ["sendMessage", null];
    const payload = !attachment ? { chat_id: recipient, text: body } : { chat_id: recipient, [mediaField as string]: attachment.url, ...(body ? { caption: body } : {}) };
    const response = await fetch(`https://api.telegram.org/bot${credentials.botToken}/${method}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const responseBody = await json(response);
    if (!response.ok) throw new Error(apiError(responseBody, "O Telegram recusou a mensagem."));
    const result = responseBody.result;
    return result && typeof result === "object" && !Array.isArray(result) && typeof (result as Record<string, unknown>).message_id !== "undefined" ? String((result as Record<string, unknown>).message_id) : crypto.randomUUID();
  }

  /** Instagram e Messenger não aceitam legenda junto do anexo — manda o anexo e, se houver texto, uma segunda mensagem de texto. */
  private async metaSend(pageOrAccountId: string, apiVersion: string, credentials: Record<string, string>, recipient: string, body: string, label: string, attachment?: Attachment): Promise<string> {
    const version = apiVersion || "v23.0";
    if (!pageOrAccountId || !credentials.accessToken) throw new ServiceUnavailableException(`Conta ou token do ${label} indisponível.`);
    const message = attachment ? { attachment: { type: metaAttachmentType(attachment.mimeType), payload: { url: attachment.url, is_reusable: false } } } : { text: body };
    const response = await fetch(`https://graph.facebook.com/${version}/${encodeURIComponent(pageOrAccountId)}/messages`, { method: "POST", headers: { Authorization: `Bearer ${credentials.accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ recipient: { id: recipient }, messaging_type: "RESPONSE", message }) });
    const payload = await json(response);
    if (!response.ok) throw new Error(apiError(payload, `O ${label} recusou a mensagem.`));
    const messageId = text(payload.message_id) || text(payload.id) || crypto.randomUUID();
    if (attachment && body) await this.metaSend(pageOrAccountId, apiVersion, credentials, recipient, body, label);
    return messageId;
  }

  private async whatsapp(config: Record<string, unknown>, credentials: Record<string, string>, recipient: string, body: string, attachment?: Attachment, template?: SendTemplate | null): Promise<string> {
    const phoneNumberId = text(config.phoneNumberId); const version = text(config.apiVersion) || "v23.0";
    if (!phoneNumberId || !credentials.accessToken) throw new ServiceUnavailableException("Número ou token do WhatsApp indisponível.");
    const type = template ? "template" : !attachment ? "text" : whatsappMessageType(attachment.mimeType);
    const payload = template
      ? { messaging_product: "whatsapp", to: recipient, type: "template", template: { name: template.name, language: { code: template.language }, ...(template.parameters.length ? { components: [{ type: "body", parameters: template.parameters.map((value) => ({ type: "text", text: value })) }] } : {}) } }
      : !attachment
        ? { messaging_product: "whatsapp", to: recipient, type: "text", text: { body } }
        : { messaging_product: "whatsapp", to: recipient, type, [type]: { link: attachment.url, ...(type === "document" ? { filename: attachment.name } : {}), ...(body && type !== "audio" ? { caption: body } : {}) } };
    const response = await fetch(`https://graph.facebook.com/${version}/${encodeURIComponent(phoneNumberId)}/messages`, { method: "POST", headers: { Authorization: `Bearer ${credentials.accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const responseBody = await json(response);
    if (!response.ok) throw new Error(apiError(responseBody, "O WhatsApp recusou a mensagem."));
    const messages = Array.isArray(responseBody.messages) ? responseBody.messages : [];
    const first = messages[0];
    return (first && typeof first === "object" && typeof (first as Record<string, unknown>).id === "string" ? String((first as Record<string, unknown>).id) : "") || crypto.randomUUID();
  }
}

function whatsappMessageType(mimeType: string): "image" | "video" | "audio" | "document" {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  return "document";
}
function metaAttachmentType(mimeType: string): "image" | "video" | "audio" | "file" {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  return "file";
}
function text(value: unknown): string { return typeof value === "string" ? value : ""; }
async function json(response: Response): Promise<Record<string, unknown>> { try { const value: unknown = await response.json(); return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; } catch { return {}; } }
function apiError(payload: Record<string, unknown>, fallback: string): string { const error = payload.error; if (error && typeof error === "object" && !Array.isArray(error) && typeof (error as Record<string, unknown>).message === "string") return String((error as Record<string, unknown>).message); return typeof payload.description === "string" ? payload.description : fallback; }
