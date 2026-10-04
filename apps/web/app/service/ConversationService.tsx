import { useState } from "react";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { serviceCycleProgress, type Conversation, type ServiceCycle } from "@spark/core";
import { ClassificationValue, Field, Label, RecordSection, Select, SlaProgress, Text, notify } from "@spark/ui-web";
import { useServiceConfiguration } from "../lib/service-configuration.client";
import { getServiceCyclesCollection, getServiceSegmentsCollection, getServiceCycleHoursCollection, getServiceCycleHolidaysCollection } from "../lib/service-cycles.client";
import { getConversationsCollection } from "../lib/inbox-collections.client";
import { RecordCustomFields } from "./RecordCustomFields";
import { CategorySelectors } from "./CategorySelectors";
import styles from "../routes/settings.module.css";
export function ConversationService({ conversation, now, canWrite }: { conversation: Conversation; now: Date; canWrite: boolean }) {
  const config = useServiceConfiguration();
  const [saving, setSaving] = useState(false);
  const [historyId, setHistoryId] = useState<string | null>(null);
  const { data: cycles = [] } = useLiveQuery({ query: q => q.from({ row: getServiceCyclesCollection() }).where(({ row }) => eq(row.conversationId, conversation.id)).orderBy(({ row }) => row.openedAt, "desc") });
  const cycle = cycles.find(c => c.id === historyId) ?? cycles[0];
  async function change(field: "serviceStatusId" | "categoryId" | "impactId" | "urgencyId", value: string | null) {
    setSaving(true);
    try { await getConversationsCollection().update(conversation.id, draft => { draft[field] = value; }).isPersisted.promise; }
    catch (error) { notify({ title: "Não foi possível salvar a classificação", description: error instanceof Error ? error.message : "Tente novamente.", tone: "error" }); }
    finally { setSaving(false); }
  }
  const priority = config.levels.find(l => l.id === conversation.servicePriorityId);
  const editable = canWrite && !saving;
  return <div className={styles.form}>
    <Field><Label>Status do atendimento</Label><Select wrapValue label="Status do atendimento" disabled={!editable} value={conversation.serviceStatusId ?? ""} options={[{ value: "", label: conversation.status === "closed" ? "Encerrado" : conversation.status === "snoozed" ? "Em espera" : "Em atendimento" }, ...config.statuses.filter(s => !s.archived || s.id === conversation.serviceStatusId).map(s => ({ value: s.id, label: s.name }))]} onValueChange={value => { void change("serviceStatusId", value || null); }} /></Field>
    <RecordSection title="Classificação"><div className={styles.form}>
    <CategorySelectors config={config} disabled={!editable} value={conversation.categoryId ?? null} onChange={value => { void change("categoryId", value); }} />
    {(["impact", "urgency"] as const).map(kind => <Field key={kind}><Label>{kind === "impact" ? "Impacto" : "Urgência"}</Label><Select label={kind === "impact" ? "Impacto" : "Urgência"} disabled={!editable} value={(kind === "impact" ? conversation.impactId : conversation.urgencyId) ?? ""} options={[{ value: "", label: kind === "impact" ? "Impacto não definido" : "Urgência não definida" }, ...config.levels.filter(l => l.kind === kind && !l.archived).map(l => ({ value: l.id, label: l.name, color: l.color, classificationKind: l.kind }))]} onValueChange={value => { void change(kind === "impact" ? "impactId" : "urgencyId", value || null); }} /></Field>)}
    <ClassificationValue fieldLabel="Prioridade" kind="priority" color={priority?.color} label={priority?.name ?? "Não definida"} />
    </div></RecordSection>
    <RecordSection title="Prazos de SLA"><div className={styles.form}>
    {cycles.length > 1 && <Select wrapValue label="Ciclo de atendimento" value={cycle?.id ?? null} options={cycles.map((c,i) => ({ value:c.id,label:`${c.closedAt ? "Encerrado" : "Atual"} · ciclo ${cycles.length-i} · ${new Date(c.openedAt).toLocaleDateString("pt-BR")}` }))} onValueChange={setHistoryId} />}
    {cycle ? <CycleProgress key={cycle.id} cycle={cycle} now={now} /> : <Text tone="secondary">SLA ainda não iniciado.</Text>}
    </div></RecordSection>
    <RecordCustomFields showAdministration={false} entityType="conversation" entityId={conversation.id} disabled={!canWrite} />
    {cycle && <RecordCustomFields showAdministration={false} key={cycle.id} entityType="service_cycle" entityId={cycle.id} disabled={!canWrite || Boolean(cycle.closedAt)} />}
  </div>;
}
function CycleProgress({ cycle, now }: { cycle: ServiceCycle; now: Date }) {
  const { data: segments = [] } = useLiveQuery({ query: q => q.from({ row: getServiceSegmentsCollection() }).where(({ row }) => eq(row.cycleId,cycle.id)) });
  const { data: hours = [], isLoading } = useLiveQuery({ query: q => q.from({ row: getServiceCycleHoursCollection() }).where(({ row }) => eq(row.cycleId,cycle.id)) });
  const { data: holidays = [] } = useLiveQuery({ query: q => q.from({ row: getServiceCycleHolidaysCollection() }).where(({ row }) => eq(row.cycleId,cycle.id)) });
  const progress = serviceCycleProgress(cycle,segments,hours,holidays,now);
  if (isLoading) return <Text tone="secondary">Carregando calendário do ciclo…</Text>;
  return <div className={styles.form}><Text size="pequeno" tone="secondary">{cycle.policyName ? cycle.policyName : "Sem política de SLA"}</Text>{(["first","total"] as const).map(kind => {
    const clock = progress[kind]; const name = kind === "first" ? "Primeira resposta" : "Atendimento total";
    if (!clock.budget) return <Text key={kind} tone="secondary">{name}: sem prazo configurado.</Text>;
    if (clock.calendarMissing) return <Text key={kind} tone="secondary">{name}: calendário útil não configurado neste ciclo.</Text>;
    if (clock.waiting) return <div key={kind} className={styles.form}><Text weight="medium" size="pequeno">{name}</Text><Text tone="secondary" size="pequeno">Aguardando mensagem do cliente</Text></div>;
    const state = clock.finished ? "Concluído" : cycle.closedAt ? "Encerrado sem resposta" : clock.paused ? "Pausado" : clock.outsideHours ? "Fora do expediente" : "Em andamento";
    return <SlaProgress key={kind} percent={clock.percent} state={clock.state} label={name} status={state} detail={`${formatDuration(Math.floor(clock.usedMs / 60000))} de ${formatDuration(clock.budget)} úteis${clock.finished || cycle.closedAt ? "" : clock.overtimeMinutes ? ` · ${formatDuration(clock.overtimeMinutes)} em atraso` : ` · restam ${formatDuration(clock.remainingMinutes ?? 0)}`}`} />;
  })}{progress.currentStatus?.budget && <SlaProgress percent={progress.currentStatus.usedMs/(progress.currentStatus.budget*60000)*100} state={progress.currentStatus.state} label={progress.currentStatus.name} detail={`${formatDuration(Math.floor(progress.currentStatus.usedMs / 60000))} de ${formatDuration(progress.currentStatus.budget)} úteis neste status`} />}</div>;
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return hours ? `${hours} h${remainder ? ` ${remainder} min` : ""}` : `${remainder} min`;
}
