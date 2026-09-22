import { z } from "zod";
import { zIntegrationConnectionId, zOrgId, zServerTimestamp, zWhatsAppTemplateId } from "./zodHelpers.js";

/** Espelha o vocabulário da Meta — não é nosso, é o que a Cloud API devolve. */
export const WHATSAPP_TEMPLATE_STATUSES = ["APPROVED", "PENDING", "REJECTED", "PAUSED", "DISABLED"] as const;
export type WhatsAppTemplateStatus = (typeof WHATSAPP_TEMPLATE_STATUSES)[number];

/**
 * Fora da janela de 24h, a Cloud API só aceita mensagem de modelo
 * pré-aprovado — texto livre é recusado. Isto é o catálogo sincronizado
 * do WABA, por conexão (cada número tem o seu). Só o corpo com variáveis
 * numeradas ({{1}}, {{2}}...) é modelado; cabeçalho/rodapé/botão ficam
 * pra quando algum modelo real da conta precisar disso.
 */
export const WhatsAppTemplateSchema = z.object({
  id: zWhatsAppTemplateId,
  orgId: zOrgId,
  connectionId: zIntegrationConnectionId,
  name: z.string().trim().min(1).max(512),
  language: z.string().trim().min(1).max(35),
  category: z.string().trim().min(1).max(64),
  status: z.enum(WHATSAPP_TEMPLATE_STATUSES),
  bodyText: z.string().max(20_000),
  variableCount: z.number().int().min(0).max(20),
  createdAt: zServerTimestamp,
  updatedAt: zServerTimestamp,
});
export type WhatsAppTemplate = z.infer<typeof WhatsAppTemplateSchema>;

export const SyncWhatsAppTemplatesResponseSchema = z.object({ templates: z.array(WhatsAppTemplateSchema) });
export type SyncWhatsAppTemplatesResponse = z.infer<typeof SyncWhatsAppTemplatesResponseSchema>;
