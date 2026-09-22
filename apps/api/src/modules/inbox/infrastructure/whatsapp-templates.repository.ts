import { BadGatewayException, Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import { createAppDbClient, integrationConnections, integrationSecrets, whatsappTemplates, withOrgContext, type SparkDb } from "@spark/db";
import { whatsAppTemplateId, type IntegrationConnectionId, type OrgId, type WhatsAppTemplate, type WhatsAppTemplateStatus } from "@spark/core";
import { SecretVault } from "../../integrations/infrastructure/secret-vault.service.js";
import { ConnectionSettingsRepository } from "../../integrations/infrastructure/connection-settings.repository.js";

interface MetaTemplate {
  name?: unknown;
  language?: unknown;
  category?: unknown;
  status?: unknown;
  components?: unknown;
}

@Injectable()
export class WhatsAppTemplatesRepository {
  private readonly db: SparkDb = createAppDbClient();
  constructor(private readonly vault: SecretVault, private readonly settings: ConnectionSettingsRepository) {}

  async list(orgId: OrgId, connectionId: IntegrationConnectionId): Promise<WhatsAppTemplate[]> {
    const rows = await withOrgContext(this.db, orgId, (tx) => tx.select().from(whatsappTemplates).where(and(eq(whatsappTemplates.orgId, orgId), eq(whatsappTemplates.connectionId, connectionId))));
    return rows.map(toTemplate);
  }

  /** Busca o catálogo inteiro na Meta e substitui o espelhado — não é nosso dado, é o dela. */
  async sync(orgId: OrgId, connectionId: IntegrationConnectionId): Promise<WhatsAppTemplate[]> {
    const loaded = await withOrgContext(this.db, orgId, async (tx) => {
      const [connection] = await tx.select().from(integrationConnections).where(and(eq(integrationConnections.id, connectionId), eq(integrationConnections.orgId, orgId), eq(integrationConnections.provider, "whatsapp"))).limit(1);
      if (!connection) throw new NotFoundException("Conexão de WhatsApp não encontrada.");
      const [secret] = await tx.select().from(integrationSecrets).where(and(eq(integrationSecrets.connectionId, connectionId), eq(integrationSecrets.orgId, orgId))).limit(1);
      if (!secret) throw new ServiceUnavailableException("Credenciais do WhatsApp indisponíveis.");
      const config = await this.settings.read(tx, connectionId);
      return { credentials: this.vault.decrypt(secret), config };
    });
    const wabaId = text(loaded.config.wabaId);
    const version = text(loaded.config.apiVersion) || "v23.0";
    if (!wabaId || !loaded.credentials.accessToken) throw new ServiceUnavailableException("Configure o ID da conta do WhatsApp Business (WABA) e o token de acesso antes de sincronizar.");
    const parsed = await this.fetchAll(wabaId, version, loaded.credentials.accessToken);

    return withOrgContext(this.db, orgId, async (tx) => {
      const rows = [];
      for (const template of parsed) {
        const [row] = await tx.insert(whatsappTemplates)
          .values({ id: whatsAppTemplateId.create(), orgId, connectionId, name: template.name, language: template.language, category: template.category, status: template.status, bodyText: template.bodyText, variableCount: template.variableCount })
          .onConflictDoUpdate({
            target: [whatsappTemplates.connectionId, whatsappTemplates.name, whatsappTemplates.language],
            set: { category: template.category, status: template.status, bodyText: template.bodyText, variableCount: template.variableCount, updatedAt: new Date() },
          })
          .returning();
        if (row) rows.push(row);
      }
      return rows.map(toTemplate);
    });
  }

  private async fetchAll(wabaId: string, version: string, accessToken: string): Promise<{ name: string; language: string; category: string; status: WhatsAppTemplateStatus; bodyText: string; variableCount: number }[]> {
    const results: ReturnType<typeof parseMetaTemplate>[] = [];
    let url: string | null = `https://graph.facebook.com/${version}/${encodeURIComponent(wabaId)}/message_templates?fields=name,language,category,status,components&limit=100`;
    while (url) {
      const response: Response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
      const payload: unknown = await response.json().catch(() => ({}));
      if (!response.ok) throw new BadGatewayException(metaError(payload));
      const body = payload as { data?: unknown; paging?: { next?: unknown } };
      if (Array.isArray(body.data)) for (const item of body.data) { const parsed = parseMetaTemplate(item); if (parsed) results.push(parsed); }
      url = typeof body.paging?.next === "string" ? body.paging.next : null;
    }
    return results.filter((item): item is NonNullable<typeof item> => item !== null);
  }
}

function parseMetaTemplate(item: unknown): { name: string; language: string; category: string; status: WhatsAppTemplateStatus; bodyText: string; variableCount: number } | null {
  if (!item || typeof item !== "object") return null;
  const template = item as MetaTemplate;
  if (typeof template.name !== "string" || typeof template.language !== "string") return null;
  const status = typeof template.status === "string" && (["APPROVED", "PENDING", "REJECTED", "PAUSED", "DISABLED"] as const).includes(template.status as WhatsAppTemplateStatus) ? template.status as WhatsAppTemplateStatus : "PENDING";
  const category = typeof template.category === "string" ? template.category : "UTILITY";
  const bodyComponent = Array.isArray(template.components) ? template.components.find((component): component is { type: unknown; text: unknown } => Boolean(component) && typeof component === "object" && (component as { type?: unknown }).type === "BODY") : undefined;
  const bodyText = bodyComponent && typeof bodyComponent.text === "string" ? bodyComponent.text : "";
  const variableCount = new Set(Array.from(bodyText.matchAll(/\{\{\s*(\d+)\s*\}\}/g), (match) => match[1])).size;
  return { name: template.name, language: template.language, category, status, bodyText, variableCount };
}
function text(value: unknown): string { return typeof value === "string" ? value : ""; }
function metaError(payload: unknown): string {
  if (payload && typeof payload === "object" && "error" in payload) {
    const error = (payload as { error?: unknown }).error;
    if (error && typeof error === "object" && "message" in error && typeof (error as { message?: unknown }).message === "string") return (error as { message: string }).message;
  }
  return "A Meta recusou a sincronização de modelos.";
}
function toTemplate(row: typeof whatsappTemplates.$inferSelect): WhatsAppTemplate {
  return { ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() } as WhatsAppTemplate;
}
