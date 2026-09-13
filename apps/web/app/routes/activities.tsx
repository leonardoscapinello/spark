import { type FormEvent, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useLiveQuery } from "@tanstack/react-db";
import { contactId as contactIdFactory, type Activity, type ActivityType } from "@spark/core";
import { optimisticActivity } from "@spark/data";
import { ActionModal, Badge, Button, CollectionToolbar, DataTable, DateTimePicker, EmptyState, Field, Input, Label, MenuButton, MenuItem, PageFrame, PageHeader, SearchSelect, Select, TableIconAction, Textarea, Icon, notify, type SelectOption, type TableColumn } from "@spark/ui-web";
import { getActivitiesCollection } from "../lib/activities-collection.client";
import { getContactsCollection } from "../lib/contacts-collection.client";
import { getSession } from "../lib/auth.client";
import { requireCapability } from "../lib/route-access.client";
import styles from "./activities.module.css";

const TYPE_OPTIONS: ReadonlyArray<{ value: ActivityType; label: string }> = [
  { value: "task", label: "Tarefa" },
  { value: "call", label: "Ligação" },
  { value: "meeting", label: "Reunião" },
  { value: "email", label: "E-mail" },
];

export async function clientLoader() {
  const session = await requireCapability("activities:read");
  void Promise.allSettled([
    getActivitiesCollection().preload(),
    ...(session.capabilities.includes("contacts:read") ? [getContactsCollection().preload()] : []),
  ]);
  return null;
}

export default function Activities() {
  const navigate = useNavigate();
  const collection = getActivitiesCollection();
  const contactsCollection = getContactsCollection();
  const { data: activities, isLoading } = useLiveQuery({ query: (q) => q.from({ activities: collection }).orderBy(({ activities: activity }) => activity.scheduledAt, "asc") });
  const canReadContacts = getSession()?.capabilities.includes("contacts:read") ?? false;
  const { data: contacts = [], isLoading: loadingContacts } = useLiveQuery({ query: (q) => canReadContacts ? q.from({ contacts: contactsCollection }).orderBy(({ contacts: contact }) => contact.name, "asc") : undefined });
  const [modalOpen, setModalOpen] = useState(false);
  const [period, setPeriod] = useState("open");
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [type, setType] = useState<ActivityType>("task");
  const [selectedContact, setSelectedContact] = useState<SelectOption | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const session = getSession();
  const canWrite = session?.capabilities.includes("activities:write") ?? false;
  const canCreate = canReadContacts && canWrite && contacts.length > 0;
  const firstRun = !isLoading && (!canReadContacts || !loadingContacts) && activities.length === 0 && period === "open" && typeFilter === "all" && !search;
  const contactNames = useMemo(() => new Map(contacts.map((contact) => [contact.id, contact.name])), [contacts]);
  const searchTerm = search.trim().toLocaleLowerCase("pt-BR");
  const now = new Date();
  const filtered = activities.filter((activity) => {
    const scheduled = new Date(activity.scheduledAt);
    const periodMatch = period === "all" || (period === "completed" ? activity.completed : period === "overdue" ? !activity.completed && scheduled < startOfToday(now) : period === "today" ? !activity.completed && isSameDay(scheduled, now) : period === "upcoming" ? !activity.completed && scheduled >= endOfToday(now) : !activity.completed);
    return periodMatch && (typeFilter === "all" || activity.type === typeFilter)
      && (!searchTerm || activity.title.toLocaleLowerCase("pt-BR").includes(searchTerm) || (activity.contactId && contactNames.get(activity.contactId)?.toLocaleLowerCase("pt-BR").includes(searchTerm)));
  });
  const overdue = activities.filter((activity) => !activity.completed && new Date(activity.scheduledAt) < startOfToday(now)).length;
  const today = activities.filter((activity) => !activity.completed && isSameDay(new Date(activity.scheduledAt), now)).length;
  const completed = activities.filter((activity) => activity.completed).length;
  const periods = [
    { value: "open", label: "Pendentes", count: activities.length - completed },
    { value: "overdue", label: "Atrasadas", count: overdue },
    { value: "today", label: "Hoje", count: today },
    { value: "upcoming", label: "Próximas", count: activities.filter((activity) => !activity.completed && new Date(activity.scheduledAt) >= endOfToday(now)).length },
    { value: "completed", label: "Concluídas", count: completed },
    { value: "all", label: "Todas", count: activities.length },
  ];
  const columns: TableColumn<Activity>[] = [
    { id: "title", label: "Atividade", cell: (activity) => <div className={styles.activityCell}><span className={styles.typeIcon}><Icon name={activity.type === "call" ? "phone" : activity.type === "meeting" ? "team" : activity.type === "email" ? "mail" : "check"} /></span><div><strong>{activity.title}</strong><span className={styles.secondary}>{typeLabel(activity.type)}</span></div></div>, sortValue: (activity) => activity.title },
    { id: "contact", label: "Pessoa", cell: (activity) => activity.contactId ? contactNames.get(activity.contactId) ?? "Pessoa indisponível" : "—", sortValue: (activity) => activity.contactId ? contactNames.get(activity.contactId) ?? "" : "" },
    { id: "date", label: "Data e hora", cell: (activity) => <span className={isOverdue(activity, now) ? styles.overdue : undefined}>{formatDateTime(activity.scheduledAt)}</span>, sortValue: (activity) => activity.scheduledAt },
    { id: "status", label: "Situação", cell: (activity) => <Badge tone={activity.completed ? "success" : isOverdue(activity, now) ? "danger" : "neutral"}>{activity.completed ? "Concluída" : isOverdue(activity, now) ? "Atrasada" : "Pendente"}</Badge>, sortValue: (activity) => activity.completed ? 2 : isOverdue(activity, now) ? 0 : 1 },
  ];

  function resetForm() {
    setTitle(""); setNotes(""); setScheduledAt(""); setType("task"); setSelectedContact(null);
  }

  async function createActivity() {
    if (!session || !title.trim() || !scheduledAt || !selectedContact) throw new Error("MISSING_FIELDS");
    const transaction = collection.insert(optimisticActivity({ contactId: contactIdFactory.from(selectedContact.value), dealId: null, type, title: title.trim(), notes: notes.trim() || null, scheduledAt: new Date(scheduledAt).toISOString() }, session.orgId));
    await transaction.isPersisted.promise;
    notify({ title: "Atividade agendada", description: title.trim(), tone: "success" });
    resetForm();
  }

  async function toggle(activity: Activity) {
    if (busyId) return;
    setBusyId(activity.id);
    try {
      const transaction = collection.update(activity.id, (draft) => { draft.completed = !activity.completed; });
      await transaction.isPersisted.promise;
      notify({ title: activity.completed ? "Atividade reaberta" : "Atividade concluída", description: activity.title, tone: "success" });
    } catch {
      notify({ title: "Não foi possível atualizar a atividade", tone: "error" });
    } finally { setBusyId(null); }
  }

  function submit(event: FormEvent) { event.preventDefault(); void createActivity().catch(() => undefined); }

  return <PageFrame className={styles.page}>
    <PageHeader icon="calendar" title="Atividades" actions={canCreate && contacts.length > 0 && !isLoading && !firstRun ? <Button onClick={() => setModalOpen(true)}>Nova atividade</Button> : undefined} />
    {firstRun && <EmptyState variant="featured" icon="calendar" title={contacts.length > 0 ? "Planeje a primeira atividade" : canReadContacts ? "Comece com uma pessoa" : "Nenhuma atividade por enquanto"} description={contacts.length > 0 ? "Agende uma tarefa, ligação ou reunião e acompanhe o que sua equipe precisa fazer." : canReadContacts ? "Cadastre uma pessoa para poder agendar tarefas, ligações e reuniões." : "A equipe ainda não registrou atividades nesta agenda."} action={contacts.length > 0 && canCreate ? <Button onClick={() => setModalOpen(true)}>Nova atividade</Button> : canReadContacts ? <Button onClick={() => void navigate("/")}>Adicionar pessoa</Button> : undefined} />}
    {!firstRun && <div className={styles.periods} role="group" aria-label="Período das atividades">{periods.map((option) => <Button key={option.value} variant="ghost" shape="rounded" className={styles.periodOption} aria-pressed={period === option.value} data-selected={period === option.value || undefined} onClick={() => setPeriod(option.value)}>{option.label}<strong>{option.count}</strong></Button>)}</div>}
    {!firstRun && <CollectionToolbar
      search={<Input aria-label="Buscar atividades" startAdornment={<Icon name="search" />} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar atividade ou pessoa" />}
      filters={<Select appearance="filter" label="Tipo de atividade" value={typeFilter} options={[{ value: "all", label: "Todos os tipos" }, ...TYPE_OPTIONS]} onValueChange={(value) => setTypeFilter(value ?? "all")} />}
      count={isLoading ? "Carregando atividades…" : `${filtered.length} ${filtered.length === 1 ? "atividade" : "atividades"}`}
    />}
    {!firstRun && <DataTable label="Agenda de atividades" rows={filtered} columns={columns} rowKey={(activity) => activity.id} rowLabel={(activity) => activity.title} state={isLoading && activities.length === 0 ? "loading" : "ready"} emptyText={activities.length ? "Nenhuma atividade neste filtro." : "Nenhuma atividade cadastrada."} actions={(activity) => <>{canReadContacts && activity.contactId && <TableIconAction label="Abrir pessoa" icon={<Icon name="right" />} onClick={() => void navigate(`/contacts/${activity.contactId}`)} />}{canWrite && <MenuButton size="sm" variant="ghost" shape="rounded" iconOnly indicator={false} icon={<Icon name="more" />} aria-label={`Mais ações de ${activity.title}`} loading={busyId === activity.id} menu={<MenuItem onClick={() => void toggle(activity)}>{activity.completed ? "Reabrir" : "Concluir"}</MenuItem>} />}</>} />}
    <ActionModal open={modalOpen} onOpenChange={(open) => { setModalOpen(open); if (!open) resetForm(); }} title="Nova atividade" confirmLabel="Agendar" errorText="Preencha pessoa, título e data para agendar." onConfirm={createActivity}>
      <form className={styles.form} onSubmit={submit}>
        <Field><Label>Pessoa</Label><SearchSelect label="Buscar pessoa" searchPlacement="dropdown" placeholder="Selecionar pessoa" options={contacts.filter((contact) => !contact.deletedAt).map((contact) => ({ value: contact.id, label: contact.name, ...(contact.email ? { description: contact.email } : {}) }))} value={selectedContact} onValueChange={setSelectedContact} /></Field>
        <Field><Label>Tipo</Label><Select label="Tipo de atividade" value={type} options={TYPE_OPTIONS} onValueChange={(value) => { if (value) setType(value as ActivityType); }} /></Field>
        <Field><Label>Título</Label><Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="O que precisa ser feito" /></Field>
        <Field><Label>Data e hora</Label><DateTimePicker label="Data e hora da atividade" mode="datetime" value={scheduledAt} onValueChange={setScheduledAt} /></Field>
        <Field><Label>Observações</Label><Textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Contexto para quem executar a atividade" /></Field>
      </form>
    </ActionModal>
  </PageFrame>;
}

function typeLabel(type: ActivityType): string { return TYPE_OPTIONS.find((option) => option.value === type)?.label ?? type; }
function startOfToday(value: Date): Date { return new Date(value.getFullYear(), value.getMonth(), value.getDate()); }
function endOfToday(value: Date): Date { return new Date(value.getFullYear(), value.getMonth(), value.getDate() + 1); }
function isSameDay(left: Date, right: Date): boolean { return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate(); }
function isOverdue(activity: Activity, now: Date): boolean { return !activity.completed && new Date(activity.scheduledAt) < startOfToday(now); }
function formatDateTime(value: string): string { return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)); }
