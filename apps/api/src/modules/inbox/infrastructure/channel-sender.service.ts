import { BadRequestException, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { and, desc, eq, inArray } from "drizzle-orm";
import { contacts, createAppDbClient, identities, integrationConnections, integrationSecrets, withOrgContext, type SparkDb } from "@spark/db";
import type { ContactId, ConversationChannel, OrgId } from "@spark/core";
import { SecretVault } from "../../integrations/infrastructure/secret-vault.service.js";
import { ConnectionSettingsRepository } from "../../integrations/infrastructure/connection-settings.repository.js";
import { EmailDeliveryService } from "../../integrations/application/email-delivery.service.js";
@Injectable()
export class ChannelSender {
  private readonly db: SparkDb = createAppDbClient();
  constructor(private readonly vault: SecretVault, private readonly email: EmailDeliveryService, private readonly settings: ConnectionSettingsRepository) {}
  async send(orgId: OrgId, contactId: ContactId, channel: ConversationChannel, subject: string, body: string): Promise<string> {
    if (channel !== "email" && channel !== "instagram" && channel !== "whatsapp") throw new BadRequestException(`O canal ${channel} ainda não aceita respostas externas.`);
    const loaded = await withOrgContext(this.db, orgId, async (tx) => {
      const providers = channel === "email" ? ["google_workspace", "smtp"] : [channel];
      const [connection] = await tx.select().from(integrationConnections).where(and(eq(integrationConnections.orgId, orgId), inArray(integrationConnections.provider, providers), eq(integrationConnections.status, "connected"))).orderBy(desc(integrationConnections.updatedAt)).limit(1);
      if (!connection) throw new ServiceUnavailableException(`Nenhuma integração conectada para ${channel}.`);
      const [secret] = await tx.select().from(integrationSecrets).where(and(eq(integrationSecrets.connectionId, connection.id), eq(integrationSecrets.orgId, orgId))).limit(1);
      if (!secret) throw new ServiceUnavailableException("Credenciais do canal indisponíveis.");
      const [contact] = await tx.select({ email: contacts.email }).from(contacts).where(and(eq(contacts.id, contactId), eq(contacts.orgId, orgId))).limit(1);
      const [identity] = await tx.select({ externalValue: identities.externalValue }).from(identities).where(and(eq(identities.contactId, contactId), eq(identities.orgId, orgId), eq(identities.channel, channel))).limit(1);
      // A configuração vem de `integration_connection_settings` (ADR-0035).
      return { connection, config: await this.settings.read(tx, connection.id), credentials: this.vault.decrypt(secret), recipient: channel === "email" ? contact?.email ?? identity?.externalValue : identity?.externalValue };
    });
    if (!loaded.recipient) throw new BadRequestException(`O contato não possui identidade ${channel}.`);
    if (loaded.connection.provider === "smtp" || loaded.connection.provider === "google_workspace") return this.email.send(orgId, { to: loaded.recipient, subject, text: body });
    if (loaded.connection.provider === "whatsapp") return this.whatsapp(loaded.config, loaded.credentials, loaded.recipient, body);
    return this.instagram(loaded.config, loaded.credentials, loaded.recipient, body);
  }
  private async instagram(config: Record<string, unknown>, credentials: Record<string, string>, recipient: string, body: string): Promise<string> { const accountId = text(config.accountId); const version = text(config.apiVersion) || "v23.0"; if (!accountId || !credentials.accessToken) throw new ServiceUnavailableException("Conta ou token do Instagram indisponível."); const response = await fetch(`https://graph.facebook.com/${version}/${encodeURIComponent(accountId)}/messages`, { method: "POST", headers: { Authorization: `Bearer ${credentials.accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ recipient: { id: recipient }, messaging_type: "RESPONSE", message: { text: body } }) }); const payload = await json(response); if (!response.ok) throw new Error(apiError(payload, "O Instagram recusou a mensagem.")); return text(payload.message_id) || text(payload.id) || crypto.randomUUID(); }
  private async whatsapp(config: Record<string, unknown>, credentials: Record<string, string>, recipient: string, body: string): Promise<string> { const phoneNumberId = text(config.phoneNumberId); const version = text(config.apiVersion) || "v23.0"; if (!phoneNumberId || !credentials.accessToken) throw new ServiceUnavailableException("Número ou token do WhatsApp indisponível."); const response = await fetch(`https://graph.facebook.com/${version}/${encodeURIComponent(phoneNumberId)}/messages`, { method: "POST", headers: { Authorization: `Bearer ${credentials.accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ messaging_product: "whatsapp", to: recipient, type: "text", text: { body } }) }); const payload = await json(response); if (!response.ok) throw new Error(apiError(payload, "O WhatsApp recusou a mensagem.")); const messages = Array.isArray(payload.messages) ? payload.messages : []; const first = messages[0]; return (first && typeof first === "object" && typeof (first as Record<string, unknown>).id === "string" ? String((first as Record<string, unknown>).id) : "") || crypto.randomUUID(); }
}
function text(value: unknown): string { return typeof value === "string" ? value : ""; }
async function json(response: Response): Promise<Record<string, unknown>> { try { const value: unknown = await response.json(); return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; } catch { return {}; } }
function apiError(payload: Record<string, unknown>, fallback: string): string { const error = payload.error; return error && typeof error === "object" && !Array.isArray(error) && typeof (error as Record<string, unknown>).message === "string" ? String((error as Record<string, unknown>).message) : fallback; }
