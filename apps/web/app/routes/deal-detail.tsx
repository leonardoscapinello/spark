import { type FormEvent, useMemo, useState } from "react";
import { Link } from "react-router";
import { eq, useLiveQuery } from "@tanstack/react-db";
import {
  contactId as contactIdFactory,
  companyId as companyIdFactory,
  dealId as dealIdFactory,
  formatBRL,
  toCents,
  stageId as stageIdFactory,
  userId as userIdFactory,
  type Activity,
  type ActivityType,
  type DealStatus,
  type Money,
} from "@spark/core";
import { optimisticActivity, syncedAmount } from "@spark/data";
import {
  ActionModal,
  Button,
  DatePicker,
  DateTimePicker,
  Field,
  Input,
  Label,
  MoneyInput,
  PageHeader,
  SearchSelect,
  Select,
  Textarea,
  Timeline,
  notify,
  type SelectOption,
} from "@spark/ui-web";
import type { Route } from "./+types/deal-detail";
import { getActivitiesCollection } from "../lib/activities-collection.client";
import { getContactsCollection } from "../lib/contacts-collection.client";
import { getDealsCollection, getPipelinesCollection, getStagesCollection } from "../lib/deals-collections.client";
import { getUsersCollection } from "../lib/users-collection.client";
import { getSession } from "../lib/auth.client";
import { getCompaniesCollection } from "../lib/companies-collection.client";
import { getEventsCollection } from "../lib/events-collection.client";
import { toTimelineItem } from "../lib/event-presentation";
import { requireCapability } from "../lib/route-access.client";
import styles from "./deal-detail.module.css";

const ACTIVITY_TYPES: ReadonlyArray<{ value: ActivityType; label: string }> = [
  { value: "task", label: "Tarefa" },
  { value: "call", label: "Ligação" },
  { value: "meeting", label: "Reunião" },
  { value: "email", label: "E-mail" },
];

export async function clientLoader() {
  const session = await requireCapability("deals:read");
  await Promise.all([
    getDealsCollection().preload(),
    getPipelinesCollection().preload(),
    getStagesCollection().preload(),
    getUsersCollection().preload(),
    getEventsCollection().preload(),
    ...(session.capabilities.includes("contacts:read") ? [getContactsCollection().preload()] : []),
    ...(session.capabilities.includes("activities:read") ? [getActivitiesCollection().preload()] : []),
    ...(session.capabilities.includes("companies:read") ? [getCompaniesCollection().preload()] : []),
  ]);
  return null;
}

export default function DealDetail({ params }: Route.ComponentProps) {
  const dealsCollection = getDealsCollection();
  const stagesCollection = getStagesCollection();
  const pipelinesCollection = getPipelinesCollection();
  const contactsCollection = getContactsCollection();
  const usersCollection = getUsersCollection();
  const activitiesCollection = getActivitiesCollection();
  const companiesCollection = getCompaniesCollection();
  const session = getSession();
  const canWrite = session?.capabilities.includes("deals:write") ?? false;
  const canMove = session?.capabilities.includes("deals:move") ?? false;
  const canReadContacts = session?.capabilities.includes("contacts:read") ?? false;
  const canReadCompanies = session?.capabilities.includes("companies:read") ?? false;
  const canReadActivities = session?.capabilities.includes("activities:read") ?? false;
  const canWriteActivities = canReadActivities && (session?.capabilities.includes("activities:write") ?? false);

  const { data: deal } = useLiveQuery({
    query: (q) => q.from({ deals: dealsCollection }).where(({ deals: item }) => eq(item.id, params.dealId)).findOne(),
  });
  const { data: stages } = useLiveQuery({ query: (q) => q.from({ stages: stagesCollection }).orderBy(({ stages: item }) => item.sortOrder, "asc") });
  const { data: pipelines } = useLiveQuery({ query: (q) => q.from({ pipelines: pipelinesCollection }) });
  const { data: contacts = [] } = useLiveQuery({ query: (q) => canReadContacts ? q.from({ contacts: contactsCollection }).orderBy(({ contacts: item }) => item.name, "asc") : undefined });
  const { data: users } = useLiveQuery({ query: (q) => q.from({ users: usersCollection }).orderBy(({ users: item }) => item.name, "asc") });
  const { data: companies = [] } = useLiveQuery({ query: (q) => canReadCompanies ? q.from({ companies: companiesCollection }).orderBy(({ companies: item }) => item.name, "asc") : undefined });
  const { data: activities = [] } = useLiveQuery({
    query: (q) => canReadActivities ? q.from({ activities: activitiesCollection }).where(({ activities: item }) => eq(item.dealId, params.dealId)).orderBy(({ activities: item }) => item.scheduledAt, "asc") : undefined,
  });
  const { data: events } = useLiveQuery({ query: (q) => q.from({ events: getEventsCollection() }).where(({ events: item }) => eq(item.dealId, params.dealId)).orderBy(({ events: item }) => item.occurredAt, "desc") });

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState<Money | null>(null);
  const [contact, setContact] = useState<SelectOption | null>(null);
  const [ownerId, setOwnerId] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [expectedCloseDate, setExpectedCloseDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [activityType, setActivityType] = useState<ActivityType>("task");
  const [activityTitle, setActivityTitle] = useState("");
  const [activityNotes, setActivityNotes] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [busyActivityId, setBusyActivityId] = useState<string | null>(null);
  const [lossModalOpen, setLossModalOpen] = useState(false);
  const [lossReason, setLossReason] = useState("");

  const pipelineStages = deal ? stages.filter((stage) => stage.pipelineId === deal.pipelineId) : [];
  const pipeline = deal ? pipelines.find((item) => item.id === deal.pipelineId) : undefined;
  const stage = deal ? stages.find((item) => item.id === deal.stageId) : undefined;
  const linkedContact = deal?.contactId ? contacts.find((item) => item.id === deal.contactId) : undefined;
  const owner = deal?.ownerId ? users.find((item) => item.id === deal.ownerId) : undefined;
  const linkedCompany = deal?.companyId ? companies.find((item) => item.id === deal.companyId) : undefined;
  const orderedActivities = useMemo(() => [...activities].sort((left, right) => Number(left.completed) - Number(right.completed) || left.scheduledAt.localeCompare(right.scheduledAt)), [activities]);

  function beginEditing() {
    if (!deal) return;
    setName(deal.name);
    setAmount(syncedAmount(deal.amount));
    setContact(linkedContact ? { value: linkedContact.id, label: linkedContact.name, ...(linkedContact.email ? { description: linkedContact.email } : {}) } : null);
    setOwnerId(deal.ownerId ?? "");
    setCompanyId(deal.companyId ?? "");
    setExpectedCloseDate(deal.expectedCloseDate?.slice(0, 10) ?? "");
    setEditing(true);
  }

  async function saveDeal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!deal || !name.trim() || amount === null || saving) return;
    setSaving(true);
    try {
      const transaction = dealsCollection.update(deal.id, (draft) => {
        draft.name = name.trim();
        draft.amount = toCents(amount);
        draft.contactId = contact ? contactIdFactory.from(contact.value) : null;
        draft.companyId = companyId ? companyIdFactory.from(companyId) : null;
        draft.ownerId = ownerId ? userIdFactory.from(ownerId) : null;
        draft.expectedCloseDate = expectedCloseDate ? new Date(`${expectedCloseDate}T12:00:00`).toISOString() : null;
      });
      await transaction.isPersisted.promise;
      setEditing(false);
      notify({ title: "Negócio atualizado", tone: "success" });
    } catch {
      notify({ title: "Não foi possível salvar o negócio", tone: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function moveDeal(value: string | null) {
    if (!deal || !value || !canMove) return;
    try {
      const transaction = dealsCollection.update(deal.id, (draft) => { draft.stageId = stageIdFactory.from(value); });
      await transaction.isPersisted.promise;
      notify({ title: "Etapa atualizada", tone: "success" });
    } catch {
      notify({ title: "Não foi possível mudar a etapa", tone: "error" });
    }
  }

  async function closeDeal(status: Extract<DealStatus, "won" | "lost">, reason?: string) {
    if (!deal || !canMove) throw new Error("FORBIDDEN");
    const transaction = dealsCollection.update(deal.id, (draft) => {
      draft.status = status;
      draft.lossReason = status === "lost" ? reason?.trim() || null : null;
    });
    await transaction.isPersisted.promise;
    notify({ title: status === "won" ? "Negócio ganho" : "Negócio perdido", tone: status === "won" ? "success" : "warning" });
  }

  async function createActivity() {
    if (!deal || !session || !activityTitle.trim() || !scheduledAt) throw new Error("MISSING_FIELDS");
    const activity = optimisticActivity({
      contactId: deal.contactId,
      dealId: dealIdFactory.from(deal.id),
      type: activityType,
      title: activityTitle.trim(),
      notes: activityNotes.trim() || null,
      scheduledAt: new Date(scheduledAt).toISOString(),
    }, session.orgId);
    const transaction = activitiesCollection.insert(activity);
    await transaction.isPersisted.promise;
    notify({ title: "Atividade agendada", description: activity.title, tone: "success" });
    setActivityTitle(""); setActivityNotes(""); setScheduledAt(""); setActivityType("task");
  }

  async function toggleActivity(activity: Activity) {
    setBusyActivityId(activity.id);
    try {
      const transaction = activitiesCollection.update(activity.id, (draft) => { draft.completed = !activity.completed; });
      await transaction.isPersisted.promise;
      notify({ title: activity.completed ? "Atividade reaberta" : "Atividade concluída", tone: "success" });
    } catch {
      notify({ title: "Não foi possível atualizar a atividade", tone: "error" });
    } finally {
      setBusyActivityId(null);
    }
  }

  if (!deal) {
    return <div className={styles.page}><Link className={styles.back} to="/deals">← Negócios</Link><p>Negócio não encontrado.</p></div>;
  }

  return <div className={styles.page}>
    <Link className={styles.back} to="/deals">← Negócios</Link>
    <PageHeader
      eyebrow={`${pipeline?.name ?? "Funil"} · ${stage?.name ?? "Etapa"}`}
      title={deal.name}
      description={`Criado em ${formatDateTime(deal.createdAt)} · atualizado em ${formatDateTime(deal.updatedAt)}`}
      actions={canWrite && !editing ? <Button variant="secondary" onClick={beginEditing}>Editar negócio</Button> : undefined}
    />

    <div className={styles.summary}>
      <div><span>Valor</span><strong>{formatBRL(syncedAmount(deal.amount))}</strong></div>
      <div><span>Situação</span><strong data-status={deal.status}>{statusLabel(deal.status)}</strong></div>
      <div><span>Previsão</span><strong>{deal.expectedCloseDate ? formatDate(deal.expectedCloseDate) : "Sem previsão"}</strong></div>
    </div>

    <div className={styles.layout}>
      <main className={styles.main}>
        {editing ? <form className={styles.editForm} onSubmit={saveDeal}>
          <Field><Label>Nome</Label><Input value={name} onChange={(event) => setName(event.target.value)} /></Field>
          <Field><Label>Valor</Label><MoneyInput label="Valor do negócio" value={amount} onValueChange={setAmount} /></Field>
          <Field><Label>Contato</Label><SearchSelect label="Contato do negócio" searchPlacement="dropdown" placeholder="Sem contato" options={contacts.filter((item) => !item.deletedAt).map((item) => ({ value: item.id, label: item.name, ...(item.email ? { description: item.email } : {}) }))} value={contact} onValueChange={setContact} /></Field>
          <Field><Label>Empresa</Label><Select label="Empresa do negócio" value={companyId || null} placeholder="Não vinculada" options={companies.filter((item) => !item.deletedAt).map((item) => ({ value: item.id, label: item.name }))} onValueChange={(value) => setCompanyId(value ?? "")} /></Field>
          <Field><Label>Responsável</Label><Select label="Responsável pelo negócio" value={ownerId || null} placeholder="Não atribuído" options={users.filter((item) => !item.deactivatedAt).map((item) => ({ value: item.id, label: item.name, avatar: item.avatarUrl }))} onValueChange={(value) => setOwnerId(value ?? "")} /></Field>
          <Field><Label>Previsão de fechamento</Label><DatePicker label="Previsão de fechamento" value={expectedCloseDate} onValueChange={setExpectedCloseDate} /></Field>
          <div className={styles.formActions}><Button type="submit" loading={saving} disabled={!name.trim() || amount === null}>Salvar</Button><Button type="button" variant="secondary" onClick={() => setEditing(false)}>Cancelar</Button></div>
        </form> : <section className={styles.details}>
          <div><span>Contato</span>{linkedContact ? <Link to={`/contacts/${linkedContact.id}`}>{linkedContact.name}</Link> : <strong>Não vinculado</strong>}</div>
          <div><span>Empresa</span>{linkedCompany ? <Link to={`/companies/${linkedCompany.id}`}>{linkedCompany.name}</Link> : <strong>Não vinculada</strong>}</div>
          <div><span>Responsável</span><strong>{owner?.name ?? "Não atribuído"}</strong></div>
          <div><span>Etapa do funil</span><Select label="Etapa do funil" value={deal.stageId} options={pipelineStages.map((item) => ({ value: item.id, label: item.name }))} disabled={!canMove || deal.status !== "open"} onValueChange={(value) => void moveDeal(value)} /></div>
          {deal.status === "lost" && <div><span>Motivo da perda</span><strong>{deal.lossReason ?? "Não informado"}</strong></div>}
          {deal.status === "open" && canMove && <div className={styles.closeActions}><Button onClick={() => void closeDeal("won").catch(() => notify({ title: "Não foi possível fechar o negócio", tone: "error" }))}>Marcar como ganho</Button><Button variant="secondary" onClick={() => setLossModalOpen(true)}>Marcar como perdido</Button></div>}
        </section>}

        <section className={styles.activities}>
          <div className={styles.sectionHeader}><div><h2>Histórico</h2><p>Mudanças registradas neste negócio.</p></div></div>
          <Timeline items={events.map(toTimelineItem)} emptyText="As próximas alterações deste negócio aparecerão aqui." />
        </section>

        <section className={styles.activities}>
          <div className={styles.sectionHeader}><div><h2>Atividades</h2><p>Próximos passos e histórico operacional deste negócio.</p></div>{canWriteActivities && <Button size="sm" onClick={() => setActivityModalOpen(true)}>Nova atividade</Button>}</div>
          {orderedActivities.length === 0 ? <div className={styles.empty}>Nenhuma atividade vinculada a este negócio.</div> : <ul className={styles.activityList}>{orderedActivities.map((activity) => <li key={activity.id} data-completed={activity.completed}>
            <div><span className={styles.activityType}>{activityTypeLabel(activity.type)}</span><strong>{activity.title}</strong>{activity.notes && <p>{activity.notes}</p>}<time>{formatDateTime(activity.scheduledAt)}</time></div>
            {canWriteActivities && <Button size="sm" variant="ghost" loading={busyActivityId === activity.id} onClick={() => void toggleActivity(activity)}>{activity.completed ? "Reabrir" : "Concluir"}</Button>}
          </li>)}</ul>}
        </section>
      </main>
    </div>

    <ActionModal open={activityModalOpen} onOpenChange={(open) => setActivityModalOpen(open)} title="Nova atividade" confirmLabel="Agendar" errorText="Preencha título, tipo, data e hora." onConfirm={createActivity}>
      <div className={styles.modalFields}>
        <Field><Label>Tipo</Label><Select label="Tipo de atividade" value={activityType} options={ACTIVITY_TYPES} onValueChange={(value) => { if (value) setActivityType(value as ActivityType); }} /></Field>
        <Field><Label>Título</Label><Input value={activityTitle} onChange={(event) => setActivityTitle(event.target.value)} placeholder="Qual é o próximo passo?" /></Field>
        <Field><Label>Data e hora</Label><DateTimePicker label="Data e hora" mode="datetime" value={scheduledAt} onValueChange={setScheduledAt} /></Field>
        <Field><Label>Observações</Label><Textarea value={activityNotes} onChange={(event) => setActivityNotes(event.target.value)} placeholder="Contexto para a equipe" /></Field>
      </div>
    </ActionModal>
    <ActionModal open={lossModalOpen} onOpenChange={setLossModalOpen} title="Marcar negócio como perdido" confirmLabel="Confirmar perda" errorText="Informe o motivo da perda." onConfirm={async () => { if (!lossReason.trim()) throw new Error("MISSING_REASON"); await closeDeal("lost", lossReason); setLossReason(""); }}>
      <Field><Label>Motivo da perda</Label><Textarea value={lossReason} onChange={(event) => setLossReason(event.target.value)} placeholder="O que impediu o fechamento?" /></Field>
    </ActionModal>
  </div>;
}

function statusLabel(status: DealStatus): string { return status === "open" ? "Em aberto" : status === "won" ? "Ganho" : "Perdido"; }
function activityTypeLabel(type: ActivityType): string { return ACTIVITY_TYPES.find((item) => item.value === type)?.label ?? type; }
function formatDate(value: string): string { return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(value)); }
function formatDateTime(value: string): string { return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)); }
