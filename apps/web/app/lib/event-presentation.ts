import type { DomainEventType, Event } from "@spark/core";
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
  "activity.created": "Atividade agendada",
  "activity.completed": "Atividade concluída",
  "activity.reopened": "Atividade reaberta",
  "conversation.created": "Conversa criada",
  "conversation.updated": "Conversa atualizada",
  "conversation.closed": "Conversa fechada",
  "conversation.reopened": "Conversa reaberta",
  "message.note_added": "Nota interna adicionada",
  "automation.created": "Automação criada",
  "automation.draft_updated": "Rascunho da automação atualizado",
  "automation.published": "Automação publicada",
  "automation.paused": "Automação pausada",
  "automation.activated": "Automação ativada",
};

export function toTimelineItem(event: Event): TimelineItem {
  const name = stringData(event, "name");
  const title = stringData(event, "title");
  const reason = stringData(event, "reason");
  return {
    id: event.id,
    title: TITLES[event.type],
    timestamp: event.occurredAt,
    ...((reason || title || name) ? { description: reason ?? title ?? name } : {}),
    tone: event.type === "deal.won" || event.type === "activity.completed" ? "positive" : event.type === "deal.lost" ? "negative" : event.type.endsWith("created") ? "accent" : "neutral",
  };
}

function stringData(event: Event, key: string): string | undefined {
  const value = event.data[key];
  return typeof value === "string" && value ? value : undefined;
}
