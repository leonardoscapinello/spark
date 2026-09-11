import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { createTransport } from "nodemailer";
import type { OrgId } from "@spark/core";
import { IntegrationRuntimeResolver } from "./integration-runtime-resolver.service.js";

export interface EmailMessage { to: string; subject: string; text: string; }

@Injectable()
export class EmailDeliveryService {
  constructor(private readonly integrations: IntegrationRuntimeResolver) {}
  async send(orgId: OrgId, message: EmailMessage): Promise<string> {
    const integration = await this.resolveProvider(orgId);
    if (integration.provider === "smtp") return this.smtp(integration.config, integration.secrets, message);
    return this.gmail(integration.config, integration.secrets, message);
  }
  private async resolveProvider(orgId: OrgId) {
    try { return await this.integrations.resolve(orgId, "google_workspace"); }
    catch { return this.integrations.resolve(orgId, "smtp"); }
  }
  private async smtp(config: Record<string, unknown>, credentials: Record<string, string>, message: EmailMessage): Promise<string> {
    const host = text(config.host); const port = Number(config.port ?? 587); const from = text(config.fromEmail) || credentials.username;
    if (!host || !from || !credentials.username || !credentials.password) throw new ServiceUnavailableException("A integração SMTP precisa de remetente e credenciais.");
    const transport = createTransport({ host, port, secure: config.secure === true, auth: { user: credentials.username, pass: credentials.password } });
    const result = await transport.sendMail({ from: text(config.fromName) ? `${text(config.fromName)} <${from}>` : from, to: message.to, subject: message.subject, text: message.text });
    return result.messageId;
  }
  private async gmail(config: Record<string, unknown>, credentials: Record<string, string>, message: EmailMessage): Promise<string> {
    if (!credentials.accessToken) throw new ServiceUnavailableException("Token OAuth do Google indisponível.");
    const from = text(config.fromEmail); const mime = [`To: ${message.to}`, ...(from ? [`From: ${from}`] : []), `Subject: ${message.subject}`, "Content-Type: text/plain; charset=utf-8", "", message.text].join("\r\n");
    const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", { method: "POST", headers: { Authorization: `Bearer ${credentials.accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ raw: Buffer.from(mime).toString("base64url") }) });
    const payload = await json(response); if (!response.ok) throw new Error(apiError(payload, "O Gmail recusou a mensagem."));
    return text(payload.id) || crypto.randomUUID();
  }
}
function text(value: unknown): string { return typeof value === "string" ? value : ""; }
async function json(response: Response): Promise<Record<string, unknown>> { try { const value: unknown = await response.json(); return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; } catch { return {}; } }
function apiError(payload: Record<string, unknown>, fallback: string): string { const error = payload.error; return error && typeof error === "object" && !Array.isArray(error) && typeof (error as Record<string, unknown>).message === "string" ? String((error as Record<string, unknown>).message) : fallback; }
