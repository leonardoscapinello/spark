import type { Company, Contact, CustomFieldDefinition, DomainEventType, Event, Stage, User } from "@spark/core";
import type { TimelineItem } from "@spark/ui-web";

const TITLES: Record<DomainEventType, string> = {
  "contact.created": "Contato criado",
  "contact.updated": "Dados do contato atualizados",
  "contact.archived": "Contato arquivado",
  "contact.restored": "Contato restaurado",
  "identity.added": "Canal adicionado",
  "company.created": "Empresa criada",
  "company.updated": "Dados da empresa atualizados",
  "company.archived": "Empresa arquivada",
  "company.restored": "Empresa restaurada",
  "deal.created": "Negócio criado",
  "deal.updated": "Dados do negócio atualizados",
  "deal.stage_changed": "Negócio movido de etapa",
  "deal.won": "Negócio ganho",
  "deal.lost": "Negócio perdido",
  "deal.reopened": "Negócio reaberto",
  "activity.created": "Atividade agendada",
  "activity.updated": "Atividade atualizada",
  "note.created": "Nota registrada",
  "note.updated": "Nota atualizada",
  "note.deleted": "Nota excluída",
  "activity.completed": "Atividade concluída",
  "activity.reopened": "Atividade reaberta",
  "conversation.created": "Conversa criada",
  "conversation.updated": "Conversa atualizada",
  "conversation.closed": "Conversa fechada",
  "conversation.reopened": "Conversa reaberta",
  "message.note_added": "Nota interna adicionada",
  "message.received": "Mensagem recebida",
  "message.queued": "Mensagem aguardando envio",
  "message.sent": "Mensagem enviada",
  "message.failed": "Falha no envio da mensagem",
  "automation.created": "Automação criada",
  "automation.draft_updated": "Rascunho da automação atualizado",
  "automation.published": "Automação publicada",
  "automation.paused": "Automação pausada",
  "automation.activated": "Automação ativada",
  "automation.run_started": "Execução de automação iniciada",
  "automation.run_completed": "Execução de automação concluída",
  "automation.run_failed": "Execução de automação falhou",
  "integration.configured": "Integração configurada",
  "integration.checked": "Conexão da integração verificada",
  "integration.disabled": "Integração desabilitada",
  "integration.enabled": "Integração habilitada",
  "file.upload_requested": "Envio de arquivo iniciado",
  "file.upload_completed": "Arquivo enviado",
  "file.deleted": "Arquivo excluído",
  "product.created": "Produto criado",
  "product.updated": "Produto atualizado",
  "product.archived": "Produto arquivado",
  "product.restored": "Produto restaurado",
  "product.variant_created": "Variação de produto criada",
  "discount_rule.created": "Regra de desconto criada",
  "discount_rule.updated": "Regra de desconto atualizada",
  "form.created": "Formulário criado",
  "form.updated": "Formulário atualizado",
  "form.published": "Formulário publicado",
  "form.unpublished": "Formulário retirado do ar",
  "form.submitted": "Formulário respondido",
  "social.channels_synced": "Canais sociais sincronizados",
  "social.post_created": "Publicação social criada",
  "social.post_scheduled": "Publicação social agendada",
  "social.post_published": "Publicação social publicada",
  "social.post_failed": "Falha na publicação social",
  "audience.created": "Público de campanha criado",
  "campaign.created": "Campanha criada",
  "campaign.sent": "Campanha enviada",
  "custom_field.created": "Campo personalizado criado",
  "custom_field.updated": "Campo personalizado alterado",
  "custom_field.archived": "Campo personalizado arquivado",
  "page.created": "Página criada",
  "page.updated": "Página atualizada",
  "page.published": "Página publicada",
  "canned_reply.created": "Resposta pronta criada",
  "canned_reply.updated": "Resposta pronta atualizada",
  "canned_reply.archived": "Resposta pronta arquivada",
};

export interface TimelinePresentationContext {
  users?: readonly User[];
  stages?: readonly Stage[];
  contacts?: readonly Contact[];
  companies?: readonly Company[];
  customFields?: readonly CustomFieldDefinition[];
}

export function toTimelineItem(event: Event, context: TimelinePresentationContext = {}): TimelineItem {
  const name = stringData(event, "name");
  const title = stringData(event, "title");
  const reason = stringData(event, "reason");
  const actor = event.actorUserId ? context.users?.find((user) => user.id === event.actorUserId) : undefined;
  const changes = readChanges(event).map((change) => ({
    label: fieldLabel(change.field, context.customFields),
    before: formatAuditValue(change.field, change.before, context),
    after: formatAuditValue(change.field, change.after, context),
  }));
  return {
    id: event.id,
    title: TITLES[event.type],
    timestamp: event.occurredAt,
    ...(reason || title || name ? { description: reason ?? title ?? name } : {}),
    ...(actor ? { actor: { name: actor.name, email: actor.email, avatarUrl: actor.avatarUrl } } : {}),
    ...(changes.length > 0 ? { changes } : {}),
    tone:
      event.type === "deal.won" || event.type === "deal.reopened" || event.type === "activity.completed"
        ? "positive"
        : event.type === "deal.lost"
          ? "negative"
          : event.type.endsWith("created")
            ? "accent"
            : "neutral",
  };
}

interface RawChange { field: string; before: unknown; after: unknown }

function readChanges(event: Event): RawChange[] {
  const raw = event.data.changes;
  if (!Array.isArray(raw)) return [];
  return raw.filter((value): value is RawChange => {
    if (!value || typeof value !== "object") return false;
    const candidate = value as Record<string, unknown>;
    return typeof candidate.field === "string" && "before" in candidate && "after" in candidate;
  });
}

const FIELD_LABELS: Readonly<Record<string, string>> = {
  name: "Título",
  amount: "Valor",
  status: "Situação",
  stageId: "Etapa",
  ownerId: "Responsável",
  contactId: "Pessoa",
  companyId: "Empresa",
  expectedCloseDate: "Fechamento previsto",
  completed: "Conclusão",
  type: "Tipo",
  title: "Título",
  description: "Descrição",
  notes: "Observações",
  scheduledAt: "Início",
  durationMinutes: "Duração",
  location: "Local",
  videoCallUrl: "Videochamada",
  priority: "Prioridade",
  availability: "Disponibilidade",
  body: "Nota",
  pinned: "Fixada",
  products: "Produto",
  "product:name": "Nome do produto",
  "product:quantityMilli": "Quantidade",
  "product:unitAmount": "Valor unitário",
  "product:discountBasisPoints": "Desconto",
  "product:taxBasisPoints": "Imposto",
  "product:sortOrder": "Ordem",
};

function fieldLabel(field: string, customFields: readonly CustomFieldDefinition[] = []): string {
  if (field.startsWith("custom:")) return customFields.find((item) => item.key === field.slice(7))?.label ?? field.slice(7);
  return FIELD_LABELS[field] ?? field.replace(/^product:/, "Produto · ");
}

function formatAuditValue(field: string, value: unknown, context: TimelinePresentationContext): string {
  if (value === null || value === undefined || value === "") return "Sem valor";
  if (field === "stageId" && typeof value === "string") return context.stages?.find((item) => item.id === value)?.name ?? value;
  if (field === "ownerId" && typeof value === "string") return context.users?.find((item) => item.id === value)?.name ?? value;
  if (field === "contactId" && typeof value === "string") return context.contacts?.find((item) => item.id === value)?.name ?? value;
  if (field === "companyId" && typeof value === "string") return context.companies?.find((item) => item.id === value)?.name ?? value;
  if ((field === "amount" || field === "product:unitAmount") && (typeof value === "number" || typeof value === "string")) {
    const cents = Number(value);
    if (Number.isFinite(cents)) return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
  }
  if (field === "durationMinutes" && typeof value === "number") return `${value} min`;
  if (field.endsWith("BasisPoints") && typeof value === "number") return `${value / 100}%`;
  if (field === "status" && typeof value === "string") return ({ open: "Aberto", won: "Ganho", lost: "Perdido" } as Record<string, string>)[value] ?? value;
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}(T.*)?$/.test(value)) {
    const date = new Date(value);
    if (!Number.isNaN(date.valueOf())) return new Intl.DateTimeFormat("pt-BR", value.includes("T") ? { dateStyle: "short", timeStyle: "short" } : { dateStyle: "short" }).format(date);
  }
  if (typeof value === "string" || typeof value === "number") return String(value);
  return JSON.stringify(value);
}

function stringData(event: Event, key: string): string | undefined {
  const value = event.data[key];
  return typeof value === "string" && value ? value : undefined;
}
