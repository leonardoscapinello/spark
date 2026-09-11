import { BadRequestException, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { and, desc, eq, inArray } from "drizzle-orm";
import { createTransport } from "nodemailer";
import { contacts, createDbClient, identities, integrationConnections, integrationSecrets, withOrgContext, type SparkDb } from "@spark/db";
import type { ContactId, ConversationChannel, OrgId } from "@spark/core";
import { SecretVault } from "../../integrations/infrastructure/secret-vault.service.js";
@Injectable()
export class ChannelSender {
  private readonly db: SparkDb = createDbClient(process.env.DATABASE_URL ?? "");
  constructor(private readonly vault: SecretVault) {}
  async send(orgId: OrgId, contactId: ContactId, channel: ConversationChannel, subject: string, body: string): Promise<string> {
    if (channel !== "email" && channel !== "instagram") throw new BadRequestException(`O canal ${channel} ainda não aceita respostas externas.`);
    const loaded = await withOrgContext(this.db, orgId, async (tx) => {
      const providers = channel === "email" ? ["google_workspace", "smtp"] : ["instagram"];
      const [connection] = await tx.select().from(integrationConnections).where(and(eq(integrationConnections.orgId, orgId), inArray(integrationConnections.provider, providers), eq(integrationConnections.status, "connected"))).orderBy(desc(integrationConnections.updatedAt)).limit(1);
      if (!connection) throw new ServiceUnavailableException(`Nenhuma integração conectada para ${channel}.`);
      const [secret] = await tx.select().from(integrationSecrets).where(and(eq(integrationSecrets.connectionId, connection.id), eq(integrationSecrets.orgId, orgId))).limit(1);
      if (!secret) throw new ServiceUnavailableException("Credenciais do canal indisponíveis.");
      const [contact] = await tx.select({ email: contacts.email }).from(contacts).where(and(eq(contacts.id, contactId), eq(contacts.orgId, orgId))).limit(1);
      const [identity] = await tx.select({ externalValue: identities.externalValue }).from(identities).where(and(eq(identities.contactId, contactId), eq(identities.orgId, orgId), eq(identities.channel, channel))).limit(1);
      return { connection, credentials: this.vault.decrypt(secret), recipient: channel === "email" ? contact?.email ?? identity?.externalValue : identity?.externalValue };
    });
    if (!loaded.recipient) throw new BadRequestException(`O contato não possui identidade ${channel}.`);
    if (loaded.connection.provider === "smtp") return this.smtp(loaded.connection.config, loaded.credentials, loaded.recipient, subject, body);
    if (loaded.connection.provider === "google_workspace") return this.gmail(loaded.connection.config, loaded.credentials, loaded.recipient, subject, body);
    return this.instagram(loaded.connection.config, loaded.credentials, loaded.recipient, body);
  }
  private async smtp(config: Record<string, unknown>, credentials: Record<string, string>, recipient: string, subject: string, body: string): Promise<string> { const host = text(config.host); const port = Number(config.port ?? 587); const from = text(config.fromEmail) || credentials.username; if (!host || !from || !credentials.username || !credentials.password) throw new ServiceUnavailableException("A integração SMTP precisa de remetente e credenciais."); const transport = createTransport({ host, port, secure: config.secure === true, auth: { user: credentials.username, pass: credentials.password } }); const result = await transport.sendMail({ from: text(config.fromName) ? `${text(config.fromName)} <${from}>` : from, to: recipient, subject, text: body }); return result.messageId; }
  private async gmail(config: Record<string, unknown>, credentials: Record<string, string>, recipient: string, subject: string, body: string): Promise<string> { if (!credentials.accessToken) throw new ServiceUnavailableException("Token OAuth do Google indisponível."); const from = text(config.fromEmail); const mime = [`To: ${recipient}`, ...(from ? [`From: ${from}`] : []), `Subject: ${subject}`, "Content-Type: text/plain; charset=utf-8", "", body].join("\r\n"); const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", { method: "POST", headers: { Authorization: `Bearer ${credentials.accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ raw: Buffer.from(mime).toString("base64url") }) }); const payload = await json(response); if (!response.ok) throw new Error(apiError(payload, "O Gmail recusou a mensagem.")); return text(payload.id) || crypto.randomUUID(); }
  private async instagram(config: Record<string, unknown>, credentials: Record<string, string>, recipient: string, body: string): Promise<string> { const accountId = text(config.accountId); const version = text(config.apiVersion) || "v23.0"; if (!accountId || !credentials.accessToken) throw new ServiceUnavailableException("Conta ou token do Instagram indisponível."); const response = await fetch(`https://graph.facebook.com/${version}/${encodeURIComponent(accountId)}/messages`, { method: "POST", headers: { Authorization: `Bearer ${credentials.accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ recipient: { id: recipient }, messaging_type: "RESPONSE", message: { text: body } }) }); const payload = await json(response); if (!response.ok) throw new Error(apiError(payload, "O Instagram recusou a mensagem.")); return text(payload.message_id) || text(payload.id) || crypto.randomUUID(); }
}
function text(value: unknown): string { return typeof value === "string" ? value : ""; }
async function json(response: Response): Promise<Record<string, unknown>> { try { const value: unknown = await response.json(); return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; } catch { return {}; } }
function apiError(payload: Record<string, unknown>, fallback: string): string { const error = payload.error; return error && typeof error === "object" && !Array.isArray(error) && typeof (error as Record<string, unknown>).message === "string" ? String((error as Record<string, unknown>).message) : fallback; }
