import { useState, type ReactNode } from "react";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { formatServiceDuration, serviceCycleProgress, type Conversation, type ServiceCycle } from "@spark/core";
import { Accordion, ClassificationValue, Icon, InlineField, Select, SlaRing, Text, notify, type AccordionItem } from "@spark/ui-web";
import { useServiceConfiguration } from "../lib/service-configuration.client";
import { getServiceCyclesCollection, getServiceSegmentsCollection, getServiceCycleHoursCollection, getServiceCycleHolidaysCollection } from "../lib/service-cycles.client";
import { getConversationsCollection } from "../lib/inbox-collections.client";
import { useCustomFieldSections } from "./RecordCustomFields";
import { CategorySelectors } from "./CategorySelectors";
import styles from "../routes/settings.module.css";

const when = (iso: string) => new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

/** Grupos de campos personalizados viram seções irmãs, com o mesmo cabeçalho das demais. */
function fieldSections(sections: ReturnType<typeof useCustomFieldSections>, prefix: string): AccordionItem[] {
  return sections.map(section => ({ value: `${prefix}${section.id || "custom"}`, title: section.name, icon: <Icon name="form" />, content: <div className={styles.inlineFields}>{section.content}</div> }));
}

/**
 * Aba "Atendimento" — o que quem atende mexe primeiro: quem cuida, como
 * classificar, os campos do atendimento (um bloco por grupo) e, por último,
 * os dados fixos da conversa. Tudo legenda | valor, como a ficha do CRM.
 */
export function ConversationService({ conversation, canWrite, ownership, details }: { conversation: Conversation; canWrite: boolean; ownership: ReactNode; details: ReactNode }) {
  const config = useServiceConfiguration();
  const [saving, setSaving] = useState(false);
  const custom = useCustomFieldSections({ entityType: "conversation", entityId: conversation.id, disabled: !canWrite });
  async function change(field: "serviceStatusId" | "categoryId" | "impactId" | "urgencyId", value: string | null) {
    setSaving(true);
    try { await getConversationsCollection().update(conversation.id, draft => { draft[field] = value; }).isPersisted.promise; }
    catch (error) { notify({ title: "Não foi possível salvar a classificação", description: error instanceof Error ? error.message : "Tente novamente.", tone: "error" }); }
    finally { setSaving(false); }
  }
  const priority = config.levels.find(l => l.id === conversation.servicePriorityId);
  const editable = canWrite && !saving;
  const fallbackStatus = conversation.status === "closed" ? "Encerrado" : conversation.status === "snoozed" ? "Em espera" : "Em atendimento";
  const status = config.statuses.find(s => s.id === conversation.serviceStatusId);
  const level = (kind: "impact" | "urgency") => {
    const name = kind === "impact" ? "Impacto" : "Urgência";
    const current = config.levels.find(l => l.id === (kind === "impact" ? conversation.impactId : conversation.urgencyId));
    return <InlineField key={kind} label={name} value={current ? <ClassificationValue kind={kind} color={current.color} label={current.name} /> : "Não definido"} empty={!current} disabled={!editable}>
      {close => <Select label={name} value={current?.id ?? ""} options={[{ value: "", label: "Não definido" }, ...config.levels.filter(l => l.kind === kind && !l.archived).map(l => ({ value: l.id, label: l.name, color: l.color, classificationKind: l.kind }))]} onValueChange={value => close(change(kind === "impact" ? "impactId" : "urgencyId", value || null))} />}
    </InlineField>;
  };
  const items: AccordionItem[] = [
    { value: "ownership", title: "Responsáveis", icon: <Icon name="users" />, content: <div className={styles.inlineFields}>{ownership}</div> },
    { value: "classification", title: "Classificação", icon: <Icon name="tag" />, content: <div className={styles.inlineFields}>
      <InlineField label="Status" value={status?.name ?? fallbackStatus} disabled={!editable}>
        {close => <Select label="Status do atendimento" value={conversation.serviceStatusId ?? ""} options={[{ value: "", label: fallbackStatus }, ...config.statuses.filter(s => !s.archived || s.id === conversation.serviceStatusId).map(s => ({ value: s.id, label: s.name }))]} onValueChange={value => close(change("serviceStatusId", value || null))} />}
      </InlineField>
      <CategorySelectors config={config} disabled={!editable} value={conversation.categoryId ?? null} onChange={value => change("categoryId", value)} />
      {level("impact")}
      {level("urgency")}
      <InlineField label="Prioridade" value={priority ? <ClassificationValue kind="priority" color={priority.color} label={priority.name} /> : "Não definida"} empty={!priority} disabled />
    </div> },
    ...fieldSections(custom, "conversation:"),
    { value: "details", title: "Detalhes da conversa", icon: <Icon name="info" />, content: <div className={styles.inlineFields}>{details}</div> },
  ];
  return <Accordion density="compact" defaultValue={items.map(item => item.value)} items={items} />;
}

/** Aba "Prazos": um bloco por relógio (anel no cabeçalho) e o ciclo com seus campos. */
export function ConversationDeadlines({ conversation, now, canWrite }: { conversation: Conversation; now: Date; canWrite: boolean }) {
  const [historyId, setHistoryId] = useState<string | null>(null);
  const { data: cycles = [] } = useLiveQuery({ query: q => q.from({ row: getServiceCyclesCollection() }).where(({ row }) => eq(row.conversationId, conversation.id)).orderBy(({ row }) => row.openedAt, "desc") });
  const cycle = cycles.find(c => c.id === historyId) ?? cycles[0];
  if (!cycle) return <Text tone="secondary" size="pequeno">Nenhum prazo em andamento nesta conversa.</Text>;
  return <CycleDeadlines key={cycle.id} cycle={cycle} cycles={cycles} now={now} canWrite={canWrite} onSelectCycle={setHistoryId} />;
}

function CycleDeadlines({ cycle, cycles, now, canWrite, onSelectCycle }: { cycle: ServiceCycle; cycles: readonly ServiceCycle[]; now: Date; canWrite: boolean; onSelectCycle: (id: string) => void }) {
  const { data: segments = [] } = useLiveQuery({ query: q => q.from({ row: getServiceSegmentsCollection() }).where(({ row }) => eq(row.cycleId,cycle.id)) });
  const { data: hours = [], isLoading } = useLiveQuery({ query: q => q.from({ row: getServiceCycleHoursCollection() }).where(({ row }) => eq(row.cycleId,cycle.id)) });
  const { data: holidays = [] } = useLiveQuery({ query: q => q.from({ row: getServiceCycleHolidaysCollection() }).where(({ row }) => eq(row.cycleId,cycle.id)) });
  const custom = useCustomFieldSections({ entityType: "service_cycle", entityId: cycle.id, disabled: !canWrite || Boolean(cycle.closedAt) });
  if (isLoading) return <Text tone="secondary" size="pequeno">Carregando calendário do ciclo…</Text>;
  const progress = serviceCycleProgress(cycle,segments,hours,holidays,now);
  const calendarMissing = progress.first.calendarMissing;
  const position = cycles.length - cycles.findIndex(c => c.id === cycle.id);

  const clockSection = (kind: "first" | "total"): AccordionItem[] => {
    const clock = progress[kind];
    if (!clock.budget || calendarMissing) return [];
    const title = kind === "first" ? "Primeira resposta" : "Atendimento total";
    const budget = `${formatServiceDuration(clock.budget)} úteis`;
    const used = formatServiceDuration(Math.floor(clock.usedMs / 60000));
    const left = Math.max(0, Math.round(100 - clock.percent));
    const situation = clock.waiting ? "Ainda não começou"
      : kind === "first" && clock.finished ? "Respondida"
      : clock.finished ? "Concluído"
      : cycle.closedAt ? "Encerrado sem resposta"
      : clock.overtimeMinutes ? "Vencido"
      : clock.paused ? "Pausado"
      : clock.outsideHours ? "Fora do expediente"
      : "Em andamento";
    return [{ value: kind, title, icon: <SlaRing percent={clock.waiting ? 0 : clock.percent} state={clock.waiting ? "on_track" : clock.state} />, content: <div className={styles.inlineFields}>
      <InlineField label="Situação" value={situation} disabled />
      <InlineField label="Prazo" numeric value={budget} disabled />
      {clock.waiting
        ? <InlineField label="Começa" value="Na primeira mensagem do cliente" disabled />
        : <>
          <InlineField label="Consumido" numeric value={`${used} · ${Math.round(clock.percent)}%`} disabled />
          {!clock.finished && !cycle.closedAt && (clock.overtimeMinutes
            ? <InlineField label="Em atraso" numeric value={formatServiceDuration(clock.overtimeMinutes)} disabled />
            : <InlineField label="Restante" numeric value={`${formatServiceDuration(clock.remainingMinutes ?? 0)} · ${left}%`} disabled />)}
        </>}
    </div> }];
  };

  const status = progress.currentStatus;
  const items: AccordionItem[] = [
    ...clockSection("first"),
    ...clockSection("total"),
    ...(status?.budget ? [{ value: "status", title: `No status ${status.name}`, icon: <SlaRing percent={status.usedMs / (status.budget * 60000) * 100} state={status.state} />, content: <div className={styles.inlineFields}>
      <InlineField label="Prazo" numeric value={`${formatServiceDuration(status.budget)} úteis`} disabled />
      <InlineField label="Consumido" numeric value={formatServiceDuration(Math.floor(status.usedMs / 60000))} disabled />
    </div> }] : []),
    { value: "cycle", title: "Ciclo", icon: <Icon name="refresh" />, content: <div className={styles.inlineFields}>
      {calendarMissing && <Text tone="secondary" size="pequeno">Configure o horário de atendimento para os prazos começarem a contar.</Text>}
      {cycles.length > 1
        ? <InlineField label="Ciclo" value={`${cycle.closedAt ? "Encerrado" : "Atual"} · ${position} de ${cycles.length}`}>
          {close => <Select label="Ciclo de atendimento" value={cycle.id} options={cycles.map((c,i) => ({ value:c.id,label:`${c.closedAt ? "Encerrado" : "Atual"} · ciclo ${cycles.length-i} · ${new Date(c.openedAt).toLocaleDateString("pt-BR")}` }))} onValueChange={id => { if (id) onSelectCycle(id); close(); }} />}
        </InlineField>
        : <InlineField label="Ciclo" value={cycle.closedAt ? "Encerrado" : "Atual"} disabled />}
      <InlineField label="Política" value={cycle.policyName ?? "Sem política de SLA"} empty={!cycle.policyName} disabled />
      <InlineField label="Aberto em" numeric value={when(cycle.openedAt)} disabled />
      {cycle.closedAt && <InlineField label="Encerrado em" numeric value={when(cycle.closedAt)} disabled />}
    </div> },
    ...fieldSections(custom, "cycle:"),
  ];
  return <Accordion density="compact" defaultValue={items.map(item => item.value)} items={items} />;
}
