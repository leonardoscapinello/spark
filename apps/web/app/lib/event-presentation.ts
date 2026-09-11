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
};

export function toTimelineItem(event: Event): TimelineItem {
  const name = stringData(event, "name");
  const title = stringData(event, "title");
  const reason = stringData(event, "reason");
  return {
    id: event.id,
    title: TITLES[event.type],
    timestamp: event.occurredAt,
    ...(reason || title || name ? { description: reason ?? title ?? name } : {}),
    tone:
      event.type === "deal.won" || event.type === "activity.completed"
        ? "positive"
        : event.type === "deal.lost"
          ? "negative"
          : event.type.endsWith("created")
            ? "accent"
            : "neutral",
  };
}

function stringData(event: Event, key: string): string | undefined {
  const value = event.data[key];
  return typeof value === "string" && value ? value : undefined;
}
