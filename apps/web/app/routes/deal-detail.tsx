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
import { Accordion, ActionModal, Avatar, BackLink, Badge, Button, CustomFieldValue, DatePicker, DateTimePicker, Field, Icon, Input, Label, MenuButton, MenuItem, MoneyInput, PageFrame, RecordPageHeader, SearchSelect, Select, Skeleton, StageProgress, Tabs, Textarea, Timeline, notify, type SelectOption } from "@spark/ui-web";
import type { Route } from "./+types/deal-detail";
import { getActivitiesCollection } from "../lib/activities-collection.client";
import { getCustomFieldsCollection } from "../lib/custom-fields-collection.client";
import { getContactsCollection } from "../lib/contacts-collection.client";
import { getDealsCollection, getPipelinesCollection, getStagesCollection } from "../lib/deals-collections.client";
import { getUsersCollection } from "../lib/users-collection.client";
import { getSession } from "../lib/auth.client";
import { getCompaniesCollection } from "../lib/companies-collection.client";
import { getEventsCollection } from "../lib/events-collection.client";
import { getConversationsCollection } from "../lib/inbox-collections.client";
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
  void Promise.allSettled([
    getDealsCollection().preload(),
    getPipelinesCollection().preload(),
    getStagesCollection().preload(),
    getUsersCollection().preload(),
    getEventsCollection().preload(),
    ...(session.capabilities.includes("contacts:read") ? [getContactsCollection().preload()] : []),
    ...(session.capabilities.includes("activities:read") ? [getActivitiesCollection().preload()] : []),
    ...(session.capabilities.includes("companies:read") ? [getCompaniesCollection().preload()] : []),
    ...(session.capabilities.includes("inbox:read") ? [getConversationsCollection().preload()] : []),
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
  const canReadInbox = session?.capabilities.includes("inbox:read") ?? false;
  const canWriteActivities = canReadActivities && (session?.capabilities.includes("activities:write") ?? false);

  const { data: deal, isLoading } = useLiveQuery({
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
  const { data: customFields = [] } = useLiveQuery({ query: (q) => q.from({ fields: getCustomFieldsCollection() }).where(({ fields: field }) => eq(field.entityType, "deal")).orderBy(({ fields: field }) => field.label, "asc") });
  const { data: events } = useLiveQuery({ query: (q) => q.from({ events: getEventsCollection() }).where(({ events: item }) => eq(item.dealId, params.dealId)).orderBy(({ events: item }) => item.occurredAt, "desc") });
  const { data: conversations = [] } = useLiveQuery({ query: (q) => canReadInbox && deal?.contactId ? q.from({ conversations: getConversationsCollection() }).where(({ conversations: item }) => eq(item.contactId, deal.contactId!)).orderBy(({ conversations: item }) => item.lastMessageAt, "desc") : undefined });

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
  const isOpen = deal?.status === "open";
  // «Foco» é o que ainda não foi feito, do mais antigo para o mais novo — o que
  // venceu aparece primeiro; «Histórico» guarda o que já foi concluído.
  const focusActivities = useMemo(() => orderedActivities.filter((activity) => !activity.completed), [orderedActivities]);
  const doneActivities = useMemo(() => orderedActivities.filter((activity) => activity.completed).reverse(), [orderedActivities]);

  /** Desfazer o fechamento: volta para em aberto e limpa o motivo da perda. */
  async function reopenDeal() {
    if (!deal || !canMove) return;
    try {
      const transaction = dealsCollection.update(deal.id, (draft) => { draft.status = "open"; draft.lossReason = null; });
      await transaction.isPersisted.promise;
      notify({ title: "Negócio reaberto", tone: "success" });
    } catch {
      notify({ title: "Não foi possível reabrir o negócio", tone: "error" });
    }
  }

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
    if (!deal || !contact || !name.trim() || amount === null || saving) return;
    setSaving(true);
    try {
      const transaction = dealsCollection.update(deal.id, (draft) => {
        draft.name = name.trim();
        draft.amount = toCents(amount);
        draft.contactId = contactIdFactory.from(contact.value);
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
    return <PageFrame className={styles.page}><BackLink render={<Link to="/deals" />}>Negócios</BackLink>{isLoading ? <div className={styles.loading} role="status" aria-label="Carregando negócio"><Skeleton /><Skeleton /><Skeleton /></div> : <p>Negócio não encontrado.</p>}</PageFrame>;
  }

  return <PageFrame className={styles.page}>
    <RecordPageHeader
      back={<BackLink render={<Link to="/deals" />}>Negócios</BackLink>}
      icon="briefcase"
      title={deal.name}
      description={`${formatBRL(syncedAmount(deal.amount))}${deal.expectedCloseDate ? ` · previsão ${formatDate(deal.expectedCloseDate)}` : ""}`}
      actions={<>
        {owner && <span className={styles.owner}><Avatar name={owner.name} size="small" /><span><small>Responsável</small>{owner.name}</span></span>}
        {isOpen && canMove && <>
          <Button onClick={() => void closeDeal("won").catch(() => notify({ title: "Não foi possível fechar o negócio", tone: "error" }))}>Ganho</Button>
          <Button variant="secondary" className={styles.lostButton} onClick={() => { setLossReason(""); setLossModalOpen(true); }}>Perdido</Button>
        </>}
        {!isOpen && <Badge tone={deal.status === "won" ? "success" : "danger"}>{statusLabel(deal.status)}</Badge>}
        {canWrite && <MenuButton iconOnly indicator={false} variant="ghost" shape="rounded" icon={<Icon name="more" />} aria-label={`Ações do negócio ${deal.name}`} menu={<>
          <MenuItem icon={<Icon name="file" />} onClick={beginEditing}>Editar negócio</MenuItem>
          {!isOpen && canMove && <MenuItem icon={<Icon name="briefcase" />} onClick={() => void reopenDeal()}>Reabrir negócio</MenuItem>}
        </>} />}
      </>}
    />

    <div className={styles.topo}>
      {pipelineStages.length > 0 && <StageProgress
        stages={pipelineStages.map((item) => ({ id: item.id, label: item.name }))}
        currentId={deal.stageId}
        currentHint={daysInStage(events.find((item) => item.type === "deal.stage_changed")?.occurredAt ?? deal.createdAt)}
        outcome={deal.status === "open" ? undefined : deal.status}
        {...(canMove && isOpen ? { onSelect: (id: string) => void moveDeal(id) } : {})}
      />}
      <p className={styles.trilha}><Link to="/deals">{pipeline?.name ?? "Funil"}</Link> <Icon name="chevron" /> {stage?.name ?? "Etapa"}</p>
    </div>

    <div className={styles.contentGrid}>
      <aside className={styles.painel}>
        <Accordion defaultValue={["resumo", "detalhes"]} items={[
          { value: "resumo", title: "Resumo", icon: <Icon name="chart" />, content: <div className={styles.details}>
            <div><span>Valor</span><strong>{formatBRL(syncedAmount(deal.amount))}</strong></div>
            <div><span>Situação</span><strong>{statusLabel(deal.status)}</strong></div>
            <div><span>Previsão</span><strong>{deal.expectedCloseDate ? formatDate(deal.expectedCloseDate) : "Sem previsão"}</strong></div>
            <div><span>Responsável</span><strong>{owner?.name ?? "Não atribuído"}</strong></div>
            {deal.status === "lost" && <div><span>Motivo da perda</span><strong>{deal.lossReason ?? "Não informado"}</strong></div>}
          </div> },
          { value: "detalhes", title: "Detalhes", icon: <Icon name="file" />, content: editing
            ? <form className={styles.editForm} onSubmit={saveDeal}>
                <Field><Label>Nome</Label><Input value={name} onChange={(event) => setName(event.target.value)} /></Field>
                <Field><Label>Valor</Label><MoneyInput label="Valor do negócio" value={amount} onValueChange={setAmount} /></Field>
                <Field><Label>Empresa</Label><Select label="Empresa do negócio" value={companyId || null} placeholder="Não vinculada" options={companies.filter((item) => !item.deletedAt).map((item) => ({ value: item.id, label: item.name }))} onValueChange={(value) => setCompanyId(value ?? "")} /></Field>
                <Field><Label>Responsável</Label><Select label="Responsável pelo negócio" value={ownerId || null} placeholder="Não atribuído" options={users.filter((item) => !item.deactivatedAt).map((item) => ({ value: item.id, label: item.name }))} onValueChange={(value) => setOwnerId(value ?? "")} /></Field>
                <Field><Label>Pessoa</Label><SearchSelect label="Pessoa do negócio" searchPlacement="dropdown" placeholder="Selecionar pessoa" options={contacts.filter((item) => !item.deletedAt).map((item) => ({ value: item.id, label: item.name, ...(item.email ? { description: item.email } : {}) }))} value={contact} onValueChange={setContact} /></Field>
                <Field><Label>Previsão de fechamento</Label><DatePicker label="Previsão de fechamento" value={expectedCloseDate} onValueChange={setExpectedCloseDate} /></Field>
                <div className={styles.formActions}><Button type="submit" loading={saving} disabled={!name.trim() || amount === null || !contact}>Salvar</Button><Button type="button" variant="secondary" onClick={() => setEditing(false)}>Cancelar</Button></div>
              </form>
            : <div className={styles.details}>
                {customFields.filter((field) => !field.archivedAt).map((field) => <CustomFieldValue
                  key={field.id}
                  field={field}
                  value={deal.customFields?.[field.key]}
                  disabled={!canWrite}
                  onSave={async (value) => { const transaction = dealsCollection.update(deal.id, (draft) => { draft.customFields = { ...draft.customFields, [field.key]: value }; }); await transaction.isPersisted.promise; }}
                  onError={(message) => notify({ title: "Valor inválido", description: message, tone: "error" })}
                  onSuccess={(label) => notify({ title: `${label} atualizado`, tone: "success" })}
                />)}
                {customFields.filter((field) => !field.archivedAt).length === 0 && <p className={styles.empty}>Nenhum campo personalizado de negócio. Crie em Configurações · Dados.</p>}
              </div> },
          { value: "pessoa", title: "Pessoa", icon: <Icon name="user" />, content: <div className={styles.details}>
            {linkedContact
              ? <><div><span>Nome</span><Link to={`/contacts/${linkedContact.id}`}>{linkedContact.name}</Link></div>
                  {linkedContact.email && <div><span>E-mail</span><strong>{linkedContact.email}</strong></div>}
                  {linkedContact.phone && <div><span>Telefone</span><strong>{linkedContact.phone}</strong></div>}</>
              : <p className={styles.empty}>Nenhuma pessoa vinculada.</p>}
          </div> },
          { value: "empresa", title: "Empresa", icon: <Icon name="building" />, content: <div className={styles.details}>
            {linkedCompany
              ? <><div><span>Nome</span><Link to={`/companies/${linkedCompany.id}`}>{linkedCompany.name}</Link></div>
                  {linkedCompany.industry && <div><span>Segmento</span><strong>{linkedCompany.industry}</strong></div>}</>
              : <p className={styles.empty}>Nenhuma empresa vinculada.</p>}
          </div> },
          ...(canReadInbox ? [{ value: "conversas", title: "Conversas", icon: <Icon name="message" />, content: !deal.contactId
            ? <p className={styles.empty}>Vincule uma pessoa para ver o atendimento.</p>
            : conversations.length === 0
              ? <p className={styles.empty}>Nenhuma conversa desta pessoa ainda.</p>
              : <ul className={styles.conversationList}>{conversations.map((conversation) => <li key={conversation.id}><Link to={`/inbox?conversation=${conversation.id}`}><div className={styles.conversationBody}><strong>{conversation.subject}</strong><span>{conversationChannelLabel(conversation.channel)} · {formatDateTime(conversation.lastMessageAt)}</span></div><Icon name="chevron" /></Link></li>)}</ul> }] : []),
        ]} />
      </aside>

      <section className={styles.fluxo}>
        {canWriteActivities && <div className={styles.compositor}>
          <Button variant="secondary" icon={<Icon name="calendar" />} onClick={() => setActivityModalOpen(true)}>Agendar atividade</Button>
          <span className={styles.compositorDica}>Toda atividade agendada aqui também aparece no calendário da equipe.</span>
        </div>}

        {canReadActivities && <section className={styles.bloco} aria-labelledby="deal-foco">
          <header className={styles.blocoCabecalho}>
            <h2 id="deal-foco" className={styles.blocoTitulo}>Foco</h2>
            <span className={styles.blocoContagem}>{focusActivities.length === 0 ? "nada pendente" : `${focusActivities.length} ${focusActivities.length === 1 ? "pendente" : "pendentes"}`}</span>
          </header>
          <div className={styles.blocoCorpo}>{focusActivities.length === 0
            ? <p className={styles.empty}>Nenhum próximo passo agendado.</p>
            : <ul className={styles.activityList}>{focusActivities.map((activity) => <li key={activity.id} data-completed="false" data-overdue={activity.scheduledAt < new Date().toISOString() ? "true" : undefined}>
                <div><span className={styles.activityType}>{activityTypeLabel(activity.type)}</span><strong>{activity.title}</strong>{activity.notes && <p>{activity.notes}</p>}<time data-overdue={activity.scheduledAt < new Date().toISOString() ? "true" : undefined}>{activity.scheduledAt < new Date().toISOString() ? "Atrasada · " : ""}{formatDateTime(activity.scheduledAt)}</time></div>
                {canWriteActivities && <Button size="sm" variant="ghost" loading={busyActivityId === activity.id} onClick={() => void toggleActivity(activity)}>Concluir</Button>}
              </li>)}</ul>}</div>
        </section>}

        <section className={styles.bloco} aria-labelledby="deal-historico">
          <header className={styles.blocoCabecalho}>
            <h2 id="deal-historico" className={styles.blocoTitulo}>Histórico</h2>
            <span className={styles.blocoContagem}>{events.length} {events.length === 1 ? "registro" : "registros"}</span>
          </header>
          <div className={styles.blocoCorpo}><Tabs label="Filtrar o histórico" defaultValue="tudo" items={[
            { value: "tudo", label: "Tudo", content: <Timeline items={events.map(toTimelineItem)} emptyText="As próximas alterações deste negócio aparecerão aqui." /> },
            ...(canReadActivities ? [{ value: "atividades", label: `Atividades (${doneActivities.length})`, content: doneActivities.length === 0
              ? <p className={styles.empty}>Nenhuma atividade concluída ainda.</p>
              : <ul className={styles.activityList}>{doneActivities.map((activity) => <li key={activity.id} data-completed="true">
                  <div><span className={styles.activityType}>{activityTypeLabel(activity.type)}</span><strong>{activity.title}</strong><time>{formatDateTime(activity.scheduledAt)}</time></div>
                  {canWriteActivities && <Button size="sm" variant="ghost" loading={busyActivityId === activity.id} onClick={() => void toggleActivity(activity)}>Reabrir</Button>}
                </li>)}</ul> }] : []),
            { value: "mudancas", label: "Mudanças", content: <Timeline items={events.filter((item) => item.type !== "activity.created").map(toTimelineItem)} emptyText="Nenhuma mudança registrada." /> },
          ]} /></div>
        </section>
      </section>
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
  </PageFrame>;
}

/** Há quanto tempo o negócio está nesta etapa — o «6 dias» do Pipedrive.
 * Sem coluna própria no banco: o último `deal.stage_changed` é o marco, e
 * enquanto não houve mudança nenhuma vale a criação. */
function daysInStage(since: string): string {
  const days = Math.max(0, Math.floor((Date.now() - new Date(since).getTime()) / 86_400_000));
  return days === 0 ? "hoje" : days === 1 ? "1 dia aqui" : `${days} dias aqui`;
}

function statusLabel(status: DealStatus): string { return status === "open" ? "Em aberto" : status === "won" ? "Ganho" : "Perdido"; }
function activityTypeLabel(type: ActivityType): string { return ACTIVITY_TYPES.find((item) => item.value === type)?.label ?? type; }
function conversationChannelLabel(channel: string): string { return ({ manual: "Interno", email: "E-mail", instagram: "Instagram", whatsapp: "WhatsApp", messenger: "Messenger" } as Record<string, string>)[channel] ?? channel; }
function formatDate(value: string): string { return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(value)); }
function formatDateTime(value: string): string { return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)); }
