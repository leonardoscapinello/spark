import { useState } from "react";
import { useNavigate } from "react-router";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { serviceCycleProgress, type Conversation, type ServiceCycle } from "@spark/core";
import { Button, CrmLabel, InlineField, Select, SlaProgress, Text, notify } from "@spark/ui-web";
import { getSession } from "../lib/auth.client";
import { useServiceConfiguration } from "../lib/service-configuration.client";
import { getServiceCyclesCollection, getServiceSegmentsCollection, getServiceCycleHoursCollection, getServiceCycleHolidaysCollection } from "../lib/service-cycles.client";
import { getConversationsCollection } from "../lib/inbox-collections.client";
import { RecordCustomFields } from "./RecordCustomFields";
import { CategorySelectors } from "./CategorySelectors";
import styles from "../routes/settings.module.css";
export function ConversationService({ conversation, now, canWrite }: { conversation: Conversation; now: Date; canWrite: boolean }) {
  const config = useServiceConfiguration();
  const navigate = useNavigate();
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
    <Select label="Status do atendimento" disabled={!editable} value={conversation.serviceStatusId ?? ""} options={[{ value: "", label: conversation.status === "closed" ? "Encerrado" : conversation.status === "snoozed" ? "Em espera" : "Em atendimento" }, ...config.statuses.filter(s => !s.archived || s.id === conversation.serviceStatusId).map(s => ({ value: s.id, label: s.name }))]} onValueChange={value => { void change("serviceStatusId", value || null); }} />
    <InlineField label="Categoria" value={config.categories.find(c => c.id === conversation.categoryId)?.name ?? "Não classificado"} disabled={!editable}>{() => <CategorySelectors config={config} value={conversation.categoryId ?? null} onChange={value => { void change("categoryId", value); }} />}</InlineField>
    {(["impact", "urgency"] as const).map(kind => <Select key={kind} label={kind === "impact" ? "Impacto" : "Urgência"} disabled={!editable} value={(kind === "impact" ? conversation.impactId : conversation.urgencyId) ?? ""} options={[{ value: "", label: kind === "impact" ? "Impacto não definido" : "Urgência não definida" }, ...config.levels.filter(l => l.kind === kind && !l.archived).map(l => ({ value: l.id, label: l.name, color: l.color }))]} onValueChange={value => { void change(kind === "impact" ? "impactId" : "urgencyId", value || null); }} />)}
    <InlineField label="Prioridade calculada" value={<CrmLabel color={priority?.color}>{priority?.name ?? "—"}</CrmLabel>} />
    {cycles.length > 1 && <Select label="Ciclo de atendimento" value={cycle?.id ?? null} options={cycles.map((c,i) => ({ value:c.id,label:`${c.closedAt ? "Encerrado" : "Atual"} · ciclo ${cycles.length-i} · ${new Date(c.openedAt).toLocaleDateString("pt-BR")}` }))} onValueChange={setHistoryId} />}
    {cycle ? <CycleProgress key={cycle.id} cycle={cycle} now={now} /> : <Text tone="secondary">SLA ainda não iniciado.</Text>}
    <RecordCustomFields entityType="conversation" entityId={conversation.id} disabled={!canWrite} />
    {cycle && <RecordCustomFields key={cycle.id} entityType="service_cycle" entityId={cycle.id} disabled={!canWrite || Boolean(cycle.closedAt)} />}
    {getSession()?.capabilities.includes("settings:manage") && <><Button size="sm" variant="ghost" onClick={() => void navigate("/admin/service/sla")}>Configurar SLA e atendimento</Button><Button size="sm" variant="ghost" onClick={() => void navigate("/admin/data/custom-fields?entity=conversation")}>Gerenciar campos do atendimento</Button></>}
  </div>;
}
function CycleProgress({ cycle, now }: { cycle: ServiceCycle; now: Date }) {
  const { data: segments = [] } = useLiveQuery({ query: q => q.from({ row: getServiceSegmentsCollection() }).where(({ row }) => eq(row.cycleId,cycle.id)) });
  const { data: hours = [], isLoading } = useLiveQuery({ query: q => q.from({ row: getServiceCycleHoursCollection() }).where(({ row }) => eq(row.cycleId,cycle.id)) });
  const { data: holidays = [] } = useLiveQuery({ query: q => q.from({ row: getServiceCycleHolidaysCollection() }).where(({ row }) => eq(row.cycleId,cycle.id)) });
  const progress = serviceCycleProgress(cycle,segments,hours,holidays,now);
  if (isLoading) return <Text tone="secondary">Carregando calendário do ciclo…</Text>;
  return <div className={styles.form}><Text size="pequeno" tone="secondary">{cycle.policyName ? `${cycle.policyName} · versão ${cycle.policyVersion}` : "Sem política de SLA"}</Text>{(["first","total"] as const).map(kind => {
    const clock = progress[kind]; const name = kind === "first" ? "Primeira resposta" : "Atendimento total";
    if (!clock.budget) return <Text key={kind} tone="secondary">{name}: sem prazo configurado.</Text>;
    if (clock.calendarMissing) return <Text key={kind} tone="secondary">{name}: calendário útil não configurado neste ciclo.</Text>;
    if (clock.waiting) return <Text key={kind} tone="secondary">{name}: aguardando mensagem do cliente.</Text>;
    const state = clock.finished ? "Concluído" : cycle.closedAt ? "Encerrado sem resposta" : clock.paused ? "Pausado" : clock.outsideHours ? "Fora do expediente" : "Em andamento";
    return <SlaProgress key={kind} percent={clock.percent} state={clock.state} label={`${name}: ${Math.floor(clock.usedMs/60000)} / ${clock.budget} min úteis · ${state}${clock.overtimeMinutes ? ` · ${clock.overtimeMinutes} min excedidos` : ` · restam ${clock.remainingMinutes} min`}`} />;
  })}{progress.currentStatus?.budget && <SlaProgress percent={progress.currentStatus.usedMs/(progress.currentStatus.budget*60000)*100} state={progress.currentStatus.state} label={`${progress.currentStatus.name}: ${Math.floor(progress.currentStatus.usedMs/60000)} / ${progress.currentStatus.budget} min úteis acumulados`} />}</div>;
}
