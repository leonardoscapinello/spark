import { z } from "zod";
import { zCustomFieldDefinitionId, zOrgId, zServerTimestamp, zUserId } from "./zodHelpers.js";
import { phone as normalizePhone } from "../format/phone.js";
import { formatBRL, money, toCents } from "../money/index.js";
/* Cada módulo do sistema pode ter os seus campos — pessoa, empresa, negócio,
 * conversa e atividade. Um campo pode alimentar outro numa automação desde que
 * os dois sejam do mesmo tipo (packages/core/rules/customFieldMapping). */
export const CUSTOM_FIELD_ENTITIES = ["contact", "company", "deal", "conversation", "activity"] as const;
export const CUSTOM_FIELD_ENTITY_LABELS: Record<CustomFieldEntity, string> = {
  contact: "Pessoa", company: "Empresa", deal: "Negócio", conversation: "Conversa", activity: "Atividade",
};
/* Tipos na ordem em que aparecem no seletor. Os cinco últimos foram trazidos do
 * Pipedrive (docs/inspiration/pipedrive): moeda, data e hora, telefone, endereço
 * web e texto longo — o que um CRM pede e "texto" não resolve. */
export const CUSTOM_FIELD_TYPES = ["text", "paragraph", "number", "currency", "date", "datetime", "phone", "url", "boolean", "single_select", "multi_select"] as const;
export const CUSTOM_FIELD_TYPE_LABELS: Record<CustomFieldType, string> = {
  text: "Texto", paragraph: "Texto longo", number: "Número", currency: "Moeda (R$)",
  date: "Data", datetime: "Data e hora", phone: "Telefone", url: "Endereço web",
  boolean: "Sim/Não", single_select: "Seleção única", multi_select: "Seleção múltipla",
};
export type CustomFieldEntity = (typeof CUSTOM_FIELD_ENTITIES)[number]; export type CustomFieldType = (typeof CUSTOM_FIELD_TYPES)[number];
export const CustomFieldDefinitionSchema = z.object({ id: zCustomFieldDefinitionId, orgId: zOrgId, entityType: z.enum(CUSTOM_FIELD_ENTITIES), key: z.string().min(1), label: z.string().min(1), type: z.enum(CUSTOM_FIELD_TYPES), required: z.boolean(), options: z.array(z.string()).optional(), createdBy: zUserId, createdAt: zServerTimestamp, updatedAt: zServerTimestamp, archivedAt: zServerTimestamp.nullable() });
export type CustomFieldDefinition = z.infer<typeof CustomFieldDefinitionSchema>;
export const CreateCustomFieldInputSchema = z.object({ id: zCustomFieldDefinitionId, entityType: z.enum(CUSTOM_FIELD_ENTITIES), label: z.string().trim().min(1, { error: "Informe o nome do campo." }).max(120), type: z.enum(CUSTOM_FIELD_TYPES), required: z.boolean().default(false), options: z.array(z.string().trim().min(1).max(100)).max(100).default([]) }).superRefine((input, ctx) => { if ((input.type === "single_select" || input.type === "multi_select") && input.options.length === 0) ctx.addIssue({ code: "custom", path: ["options"], message: "Campos de seleção precisam de opções." }); });
export type CreateCustomFieldInput = z.infer<typeof CreateCustomFieldInputSchema>;
export const ArchiveCustomFieldInputSchema = z.object({ archived: z.boolean() });
export const CustomFieldWriteResponseSchema = z.object({ field: CustomFieldDefinitionSchema, txid: z.number().int() });
export type CustomFieldWriteResponse = z.infer<typeof CustomFieldWriteResponseSchema>;

/**
 * As opções como lista, venha de onde vier.
 *
 * `options` é `jsonb` no banco e a sincronização entrega o valor como o texto
 * cru que o Postgres mandou — o schema Zod só transforma escrita local, nunca
 * leitura sincronizada. Ler direto com `.map` estoura a tela. A coluna virou `custom_field_options`
 * (ADR-0035); isto continua aqui para um campo cuja lista ainda não foi
 * carregada, e devolve lista vazia em vez de estourar.
 */
export function customFieldOptions(field: Pick<CustomFieldDefinition, "options">): string[] {
  const raw: unknown = field.options;
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === "string") {
    try { const parsed: unknown = JSON.parse(raw); return Array.isArray(parsed) ? parsed.map(String) : []; } catch { return []; }
  }
  return [];
}

/**
 * Valida e converte o que a pessoa digitou no que vai para o banco.
 *
 * `allowedOptions` são as opções válidas do campo. Elas vêm de
 * `custom_field_options` (ADR-0035), não mais de uma coluna jsonb da
 * definição — por isso entram por parâmetro: quem chama é quem tem a lista
 * sincronizada.
 */
export function normalizeCustomFieldValue(field: CustomFieldDefinition, value: unknown, allowedOptions: readonly string[] = customFieldOptions(field)): unknown {
  if (value === "" || value === null || value === undefined) { if (field.required) throw new Error(`${field.label} é obrigatório.`); return null; }
  if (field.type === "text" || field.type === "paragraph") return String(value).trim();
  if (field.type === "number") { const parsed = typeof value === "number" ? value : Number(value); if (!Number.isFinite(parsed)) throw new Error(`${field.label} precisa ser um número.`); return parsed; }
  // Moeda em centavos inteiros, como todo dinheiro no sistema (packages/core/money).
  /* Dinheiro: **número é centavo**, como em todo o sistema (packages/core/money,
   * CLAUDE.md regra de dinheiro) — é o que o `MoneyInput` devolve. Texto é o
   * que uma pessoa digitou em reais, com vírgula decimal. Sem essa distinção,
   * o mesmo 1500 significaria R$ 15,00 num caminho e R$ 1.500,00 no outro. */
  if (field.type === "currency") {
    if (typeof value === "number") {
      if (!Number.isInteger(value)) throw new Error(`${field.label} precisa ser um valor em centavos inteiros.`);
      return toCents(money(value));
    }
    const parsed = Number(String(value).replace(/\./g, "").replace(",", "."));
    if (!Number.isFinite(parsed)) throw new Error(`${field.label} precisa ser um valor.`);
    return toCents(money(Math.round(parsed * 100)));
  }
  if (field.type === "boolean") return value === true;
  if (field.type === "date") { const parsed = new Date(String(value)); if (Number.isNaN(parsed.getTime())) throw new Error(`${field.label} precisa ser uma data.`); return parsed.toISOString().slice(0, 10); }
  if (field.type === "datetime") { const parsed = new Date(String(value)); if (Number.isNaN(parsed.getTime())) throw new Error(`${field.label} precisa ser uma data e hora.`); return parsed.toISOString(); }
  // Telefone passa pela mesma regra do telefone da pessoa — um formato só no sistema.
  if (field.type === "phone") { try { return normalizePhone(String(value)); } catch { throw new Error(`${field.label} precisa ser um telefone válido.`); } }
  // Sem `new URL`: o core não depende de plataforma (roda em Node, navegador e RN).
  if (field.type === "url") { const raw = String(value).trim().replace(/\s/g, ""); const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`; if (!/^https?:\/\/[a-z0-9-]+(\.[a-z0-9-]+)+(:\d+)?(\/[^\s]*)?$/i.test(withScheme)) throw new Error(`${field.label} precisa ser um endereço web.`); return withScheme; }
  if (field.type === "single_select") { const selected = String(value); if (!allowedOptions.includes(selected)) throw new Error(`Opção inválida em ${field.label}.`); return selected; }
  const selected = Array.isArray(value) ? value.map(String) : []; if (selected.some((item) => !allowedOptions.includes(item))) throw new Error(`Opção inválida em ${field.label}.`); return selected;
}

/**
 * Par de leitura do normalizeCustomFieldValue: o que aquele grava, este exibe.
 * Nunca lança — formatar para a tela não é validação, e um valor estranho vindo
 * de import ou de versão antiga do campo precisa aparecer, não derrubar a lista.
 *
 * Data é formatada por texto, não por `new Date`: o valor gravado é um dia civil
 * ("2026-09-14"), e converter para Date o trataria como meia-noite UTC — em
 * Brasília isso exibe o dia anterior.
 */
export function formatCustomFieldValue(field: CustomFieldDefinition, value: unknown): string {
  if (value === null || value === undefined || value === "") return "";
  if (field.type === "boolean") return value === true ? "Sim" : "Não";
  if (field.type === "number") return typeof value === "number" && Number.isFinite(value) ? new Intl.NumberFormat("pt-BR").format(value) : String(value);
  if (field.type === "date") { const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value)); return match ? `${match[3]}/${match[2]}/${match[1]}` : String(value); }
  if (field.type === "currency") return typeof value === "number" && Number.isFinite(value) ? formatBRL(money(value)) : String(value);
  if (field.type === "datetime") { const parsed = new Date(String(value)); return Number.isNaN(parsed.getTime()) ? String(value) : new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(parsed); }
  if (field.type === "multi_select") return Array.isArray(value) ? value.map(String).join(", ") : String(value);
  return String(value);
}

/**
 * Trocar a lista de opções de um campo de seleção depois de criado.
 *
 * A lista chega inteira, na ordem em que deve aparecer: é assim que a tela
 * mostra, e é a única forma que também diz o que foi REMOVIDO. Opção retirada
 * é arquivada, nunca apagada — o valor que alguém já escolheu continua
 * apontando para ela, e um relatório antigo não pode perder a legenda.
 */
export const UpdateCustomFieldOptionsInputSchema = z.object({
  options: z.array(z.string().trim().min(1).max(100)).max(100),
});
export type UpdateCustomFieldOptionsInput = z.infer<typeof UpdateCustomFieldOptionsInputSchema>;
