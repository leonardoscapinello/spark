import { getScoreSnapshotsCollection } from "../lib/score-collection.client";
import { MergePerson } from "../crm/MergePerson";
import { type FormEvent, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { eq, useLiveQuery } from "@tanstack/react-db";
import {
  contactId as contactIdFactory,
  formatPhone,
  email as buildEmail,
  phone as buildPhone,
  userId as userIdFactory,
  companyId as companyIdFactory,
  type ActivityType,
  type IdentityChannel,
} from "@spark/core";
import { optimisticActivity, optimisticIdentity, writeAccepted } from "@spark/data";
import { Accordion, Avatar, BackLink, Button, Card, DateTimePicker, DataChart, EmptyState, Field, Form, Icon, InlineField, Input, Label, ListRow, RecordPageHeader, RowList, SegmentedControl, Select, Signal, Skeleton, ScoreGauge, Tabs, Text, Timeline, UserAvatar, userSelectOption, notify } from "@spark/ui-web";
import type { Route } from "./+types/contact-detail";
import { getContactsCollection } from "../lib/contacts-collection.client";
import { getActivitiesCollection } from "../lib/activities-collection.client";
import { getUsersCollection } from "../lib/users-collection.client";
import { getCompaniesCollection } from "../lib/companies-collection.client";
import { getDealsCollection, getStagesCollection } from "../lib/deals-collections.client";
import { getConversationsCollection } from "../lib/inbox-collections.client";
import { getContactEventsCollection } from "../lib/events-collection.client";
import { groupTimelineEvents } from "../lib/event-presentation";
import { getIdentitiesCollection } from "../lib/identities-collection.client";
import { LEAD_SOURCE_OPTIONS, LEAD_STATUS_OPTIONS } from "../lib/lead-options";
import { getSession } from "../lib/auth.client";
import { requireCapability } from "../lib/route-access.client";
import layout from "./contact-profile-layout.module.css";
import { getCustomFieldsCollection } from "../lib/custom-fields-collection.client";
import { getCustomFieldOptionsCollection, getCustomFieldValuesCollection } from "../lib/custom-field-data.client";
import { RecordCustomFields } from "../service/RecordCustomFields";

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const session = await requireCapability("contacts:read");
  void Promise.allSettled([
    getContactsCollection().preload(),
    getUsersCollection().preload(),
    getContactEventsCollection(contactIdFactory.from(params.contactId)).preload(),
    getIdentitiesCollection().preload(),
    getCustomFieldsCollection().preload(),
    getCustomFieldValuesCollection().preload(),
    getCustomFieldOptionsCollection().preload(),
    ...(session.capabilities.includes("activities:read") ? [getActivitiesCollection().preload()] : []),
    ...(session.capabilities.includes("companies:read") ? [getCompaniesCollection().preload()] : []),
    ...(session.capabilities.includes("deals:read") ? [getDealsCollection().preload(), getStagesCollection().preload()] : []),
    ...(session.capabilities.includes("inbox:read") ? [getConversationsCollection().preload()] : []),
  ]);
  return null;
}

const TYPES: { value: ActivityType; label: string }[] = [
  { value: "task", label: "Tarefa" },
  { value: "call", label: "Ligação" },
  { value: "meeting", label: "Reunião" },
  { value: "email", label: "E-mail" },
];

const IDENTITY_CHANNEL_OPTIONS: { value: IdentityChannel; label: string }[] = [
  { value: "email", label: "E-mail" },
  { value: "phone", label: "Telefone" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "instagram", label: "Instagram" },
  { value: "messenger", label: "Messenger" },
];

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(iso));
}

export default function ContactDetail({ params }: Route.ComponentProps) {
  return <ContactProfile contactId={params.contactId} />;
}

/**
 * O perfil da pessoa, sem depender de ser uma rota.
 *
 * Existe separado porque a mesma tela aparece em dois lugares: como página e
 * dentro do painel sobreposto do negócio. Duplicar seria garantir que as duas
 * divergissem na primeira mudança.
 *
 * Dentro do painel, `onBack` fecha a ficha e devolve ao negócio sem navegar.
 */
export function ContactProfile({ contactId, embedded = false, onBack }: { contactId: string; embedded?: boolean; onBack?: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const requestedReturn = new URLSearchParams(location.search).get("returnTo");
  const returnTo = requestedReturn?.startsWith("/") ? requestedReturn : null;
  const backHref = returnTo ?? "/";
  const backLabel = returnTo ? "Voltar ao negócio" : "Pessoas";
  const collection = getContactsCollection();
  const activitiesCollection = getActivitiesCollection();
  const usersCollection = getUsersCollection();
  const session = getSession();
  const canWrite = session?.capabilities.includes("contacts:write") ?? false;
  const canReadActivities = session?.capabilities.includes("activities:read") ?? false;
  const canWriteActivities = canReadActivities && (session?.capabilities.includes("activities:write") ?? false);
  const canReadCompanies = session?.capabilities.includes("companies:read") ?? false;
  const canReadDeals = session?.capabilities.includes("deals:read") ?? false;
  const canWriteDeals = session?.capabilities.includes("deals:write") ?? false;
  const canReadInbox = session?.capabilities.includes("inbox:read") ?? false;
  const canWriteInbox = session?.capabilities.includes("inbox:write") ?? false;
  const [selectedType, setSelectedType] = useState<ActivityType>("task");
  const [activityTitle, setActivityTitle] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [activityComposerOpen, setActivityComposerOpen] = useState(false);
  const [activityPending, setActivityPending] = useState(false);
  const [contactFieldPending, setContactFieldPending] = useState<string | null>(null);
  const [identityChannel, setIdentityChannel] = useState<IdentityChannel>("email");
  const [identityValue, setIdentityValue] = useState("");
  const [identityPending, setIdentityPending] = useState(false);


  const { data, isLoading } = useLiveQuery({
    query: (q) =>
      q
        .from({ contacts: collection })
        .where(({ contacts: c }) => eq(c.id, contactId))
        .findOne(),
  });

  const { data: activities = [] } = useLiveQuery({
    query: (q) => canReadActivities
      ? q
        .from({ activities: activitiesCollection })
        .where(({ activities: a }) => eq(a.contactId, contactId))
        .orderBy(({ activities: a }) => a.scheduledAt, "asc")
      : undefined,
  });

  const { data: users } = useLiveQuery({
    query: (q) => q.from({ users: usersCollection }).orderBy(({ users: user }) => user.name, "asc"),
  });
  const { data: companies = [] } = useLiveQuery({ query: (q) => canReadCompanies ? q.from({ companies: getCompaniesCollection() }).orderBy(({ companies: item }) => item.name, "asc") : undefined });
  const { data: events = [] } = useLiveQuery({ query: (q) => q.from({ events: getContactEventsCollection(contactIdFactory.from(contactId)) }).orderBy(({ events: item }) => item.occurredAt, "desc") });
  const { data: identities } = useLiveQuery({ query: (q) => q.from({ identities: getIdentitiesCollection() }).where(({ identities: item }) => eq(item.contactId, contactId)).orderBy(({ identities: item }) => item.createdAt, "asc") });
  const { data: customFields } = useLiveQuery({ query: (q) => q.from({ fields: getCustomFieldsCollection() }).where(({ fields: item }) => eq(item.entityType, "contact")).orderBy(({ fields: item }) => item.label, "asc") });
  // Valores vindos das colunas tipadas, não do jsonb (ADR-0035).
  const { data: deals = [] } = useLiveQuery({ query: (q) => canReadDeals ? q.from({ deals: getDealsCollection() }).where(({ deals: item }) => eq(item.contactId, contactId)).orderBy(({ deals: item }) => item.updatedAt, "desc") : undefined });
  const { data: stages = [] } = useLiveQuery({ query: (q) => canReadDeals ? q.from({ stages: getStagesCollection() }) : undefined });
  const { data: conversations = [] } = useLiveQuery({ query: (q) => canReadInbox ? q.from({ conversations: getConversationsCollection() }).where(({ conversations: item }) => eq(item.contactId, contactId)).orderBy(({ conversations: item }) => item.lastMessageAt, "desc") : undefined });

  async function addIdentity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const session = getSession();
    const value = identityValue.trim();
    if (!session || !value || identityPending) return;
    setIdentityPending(true);
    try {
      const transaction = getIdentitiesCollection().insert(optimisticIdentity({ contactId: contactIdFactory.from(contactId), channel: identityChannel, externalValue: value }, session.orgId));
      await transaction.isPersisted.promise;
      setIdentityValue("");
      notify({ title: "Canal adicionado", tone: "success" });
    } catch (error) {
      notify({ title: "Não foi possível adicionar o canal", description: error instanceof Error ? error.message : "Confira o valor e tente novamente.", tone: "error" });
    } finally {
      setIdentityPending(false);
    }
  }

  async function updateLifecycle(field: "leadStatus" | "source" | "ownerId" | "companyId", value: string | null) {
    if (!data || contactFieldPending) return;
    setContactFieldPending(field);
    try {
      await writeAccepted((metadata) => collection.update(data.id, { metadata }, (draft) => {
        if (field === "leadStatus") draft.leadStatus = value as typeof draft.leadStatus;
        if (field === "source") draft.source = value;
        if (field === "ownerId") draft.ownerId = value ? userIdFactory.from(value) : null;
        if (field === "companyId") draft.companyId = value ? companyIdFactory.from(value) : null;
      }));
      notify({ title: "Lead atualizado", tone: "success" });
    } catch (cause) {
      notify({ title: "Não foi possível atualizar o lead", tone: "error" });
      // A linha (InlineField) mostra a falha na própria caixa.
      throw cause;
    } finally {
      setContactFieldPending(null);
    }
  }

  async function addActivity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const session = getSession();
    if (!session) return;

    const title = activityTitle.trim();
    if (!title || !scheduledAt || activityPending) return;

    const activity = optimisticActivity(
      {
        contactId: contactIdFactory.from(contactId),
        dealId: null,
        type: selectedType,
        title,
        notes: null,
        scheduledAt: new Date(scheduledAt).toISOString(),
      },
      session.orgId,
    );
    setActivityPending(true);
    try {
      const transaction = activitiesCollection.insert(activity);
      await transaction.isPersisted.promise;
      setActivityTitle("");
      setScheduledAt("");
      setActivityComposerOpen(false);
      notify({ title: "Atividade agendada", description: `${title} foi adicionada à pessoa.`, tone: "success" });
    } catch {
      notify({ title: "Não foi possível agendar", description: "Tente novamente em instantes.", tone: "error" });
    } finally {
      setActivityPending(false);
    }
  }

  async function toggleCompleted(id: string, title: string, completed: boolean) {
    const transaction = activitiesCollection.update(id, (draft) => {
      draft.completed = completed;
    });
    try {
      await transaction.isPersisted.promise;
      notify({ title: completed ? "Atividade concluída" : "Atividade reaberta", description: title, tone: "success" });
    } catch {
      notify({ title: "Não foi possível atualizar a atividade", tone: "error" });
    }
  }

  /**
   * Nome, e-mail e telefone mudam no lugar (InlineField): a mesma validação do
   * core, e o erro volta para a linha em vez de um formulário à parte.
   */
  async function saveContact(field: "name" | "email" | "phone", raw: string) {
    if (!data) return;
    const text = raw.trim();
    let next: string | null = text || null;
    if (field === "name" && !text) throw new Error("O nome não pode ficar vazio.");
    try {
      if (field === "email" && text) next = buildEmail(text);
      if (field === "phone" && text) next = buildPhone(text);
    } catch {
      const message = field === "email" ? "E-mail inválido." : "Telefone inválido — use DDD + número.";
      notify({ title: message, tone: "error" });
      throw new Error(message);
    }
    if (field === "name" && next === data.name) return;
    if (field === "email" && next === data.email) return;
    if (field === "phone" && next === data.phone) return;
    await writeAccepted((metadata) => collection.update(data.id, { metadata }, (draft) => {
      if (field === "name" && next) draft.name = next;
      if (field === "email") draft.email = next as typeof draft.email;
      if (field === "phone") draft.phone = next as typeof draft.phone;
    }));
  }

  const { data: scoreSnapshots = [] } = useLiveQuery({ query: q => q.from({ snapshots: getScoreSnapshotsCollection(contactId) }).orderBy(({ snapshots }) => snapshots.day, "asc") });

  if (!data) {
    return (
      <div className={layout.page}>
        {!embedded && <BackLink render={<Link to={backHref} />}>{backLabel}</BackLink>}
        {isLoading ? <div className={layout.loading} role="status" aria-label="Carregando pessoa"><Skeleton className={layout.loadingLine} /><Skeleton className={layout.loadingLine} /><Skeleton className={layout.loadingLine} /></div> : <Text tone="secondary">Pessoa não encontrada.</Text>}
      </div>
    );
  }

  const owner = data.ownerId ? users.find((user) => user.id === data.ownerId) : undefined;
  const company = data.companyId ? companies.find((item) => item.id === data.companyId) : undefined;
  const now = new Date().toISOString();
  const busy = contactFieldPending !== null;

  const latestScore = scoreSnapshots.at(-1);
  const scoreChart = scoreSnapshots.map(snapshot => ({ label: snapshot.day, score: snapshot.hasEvidence && snapshot.modelId === latestScore?.modelId ? snapshot.value : null }));
  const pendingActivities = activities.filter((activity) => !activity.completed);
  const completedActivities = activities.filter((activity) => activity.completed);
  const activityList = (completed: boolean) => {
    const items = completed ? completedActivities : pendingActivities;
    if (items.length === 0) return <EmptyState variant="onboarding" icon="calendar" title={completed ? "Nenhuma atividade concluída" : "Nenhuma atividade pendente"} description={completed ? "As atividades concluídas ficam disponíveis aqui." : "Agende o próximo contato com esta pessoa."} />;
    return <RowList label={completed ? "Atividades concluídas" : "Atividades pendentes"}>{items.map((activity, index) => {
                const overdue = !activity.completed && activity.scheduledAt < now;
                const kind = TYPES.find((t) => t.value === activity.type)?.label ?? activity.type;
                return <ListRow key={activity.id} index={index} icon={activity.type === "call" ? "phone" : activity.type === "meeting" ? "team" : activity.type === "email" ? "mail" : "check"} done={activity.completed} title={activity.title} description={overdue ? <Signal tone="danger">Atrasada · {kind}</Signal> : kind} meta={formatDateTime(activity.scheduledAt)} trailing={canWriteActivities ? <Button variant="ghost" size="sm" onClick={() => void toggleCompleted(activity.id, activity.title, !activity.completed)}>{activity.completed ? "Reabrir" : "Concluir"}</Button> : undefined} />;
    })}</RowList>;
  };
  const returnDeal = deals.find((deal) => returnTo?.split("?")[0] === `/deals/${deal.id}`);
  const backControl = embedded
    ? (onBack ? <Button variant="secondary" icon={<Icon name="left" />} onClick={onBack}>Voltar ao negócio</Button> : null)
    : returnTo ? <div className={layout.backContext}><Button variant="secondary" icon={<Icon name="left" />} render={<Link to={backHref} />}>Voltar ao negócio</Button>{returnDeal && <Text size="pequeno" tone="secondary">{returnDeal.name}</Text>}</div>
    : <BackLink render={<Link to={backHref} />}>{backLabel}</BackLink>;
  const activitiesContent = <Card title="Atividades" description="Próximos contatos e tarefas desta pessoa." actions={canWriteActivities ? <Button variant="secondary" size="sm" icon={<Icon name="plus" />} onClick={() => setActivityComposerOpen(true)} disabled={activityComposerOpen}>Agendar atividade</Button> : undefined}>
    <div className={layout.stack}>
      {canWriteActivities && activityComposerOpen && <Form className={layout.form} onSubmit={addActivity}>
                <SegmentedControl label="Tipo de atividade" value={selectedType} options={TYPES} onValueChange={setSelectedType} />
                <Field>
                  <Label>Título</Label>
                  <Input value={activityTitle} onChange={(event) => setActivityTitle(event.target.value)} placeholder="O que precisa ser feito" />
                </Field>
                <Field>
                  <Label>Quando</Label>
                  <DateTimePicker label="Data e hora da atividade" mode="datetime" value={scheduledAt} onValueChange={setScheduledAt} placeholder="Selecionar data e hora" />
                </Field>
                <div className={layout.formActions}><Button type="button" variant="ghost" size="sm" disabled={activityPending} onClick={() => setActivityComposerOpen(false)}>Cancelar</Button><Button type="submit" size="sm" loading={activityPending} disabled={!activityTitle.trim() || !scheduledAt}>Adicionar atividade</Button></div>
              </Form>}
      <Tabs variant="segmented" label="Situação das atividades" defaultValue="pendentes" items={[
        { value: "pendentes", label: `Pendentes (${pendingActivities.length})`, content: activityList(false) },
        { value: "concluidas", label: `Concluídas (${completedActivities.length})`, content: activityList(true) },
      ]} />
    </div>
  </Card>;
  const historyContent = <Card title="Histórico" description="Alterações e registros relacionados a esta pessoa.">
    <Timeline collapseChanges initialCount={10} pageSize={10} density="compact" groupByDay items={groupTimelineEvents(events, { users, companies, customFields, stages })} emptyText="As próximas alterações desta pessoa aparecerão aqui." />
  </Card>;

  return (
    <div className={[layout.page, layout.personPage, embedded ? layout.embedded : ""].filter(Boolean).join(" ")}>
      <RecordPageHeader back={backControl} icon="user" avatarName={data.name} eyebrow="Pessoa" title={data.name} description={`${data.email ?? "Sem e-mail"} · ${data.phone ? formatPhone(data.phone) : "Sem telefone"}`} actions={canWrite || canWriteInbox ? <>{canWrite && <MergePerson contactId={contactId} name={data.name} />}{canWriteInbox && <Button onClick={() => void navigate(`/inbox?box=all&createFor=${contactId}`)}>Nova conversa</Button>}</> : undefined} metrics={[{ label: "Etapa", value: LEAD_STATUS_OPTIONS.find((option) => option.value === data.leadStatus)?.label ?? data.leadStatus, icon: "check" }, { label: "Empresa", value: company?.name ?? "Não vinculada", icon: "building" }]} />
      <div className={layout.personGrid}>
        <div className={layout.profileColumn}>
          {/* Todo valor da ficha passa pelo InlineField: a mesma caixa parada,
            * vazia e editando, como na ficha do negócio. */}
          <Accordion defaultValue={["general", "relationship"]} items={[{ value: "general", title: "Dados de contato", content:
            <div className={layout.fields}>
              <InlineField label="Nome" value={data.name} disabled={!canWrite}>{(close) => <Input aria-label="Nome" defaultValue={data.name} onBlur={(event) => close(saveContact("name", event.currentTarget.value))} />}</InlineField>
              <InlineField label="E-mail" value={data.email ?? "Sem e-mail"} empty={!data.email} disabled={!canWrite}>{(close) => <Input aria-label="E-mail" type="email" defaultValue={data.email ?? ""} placeholder="nome@empresa.com.br" onBlur={(event) => close(saveContact("email", event.currentTarget.value))} />}</InlineField>
              <InlineField label="Telefone" numeric value={data.phone ? formatPhone(data.phone) : "Sem telefone"} empty={!data.phone} disabled={!canWrite}>{(close) => <Input aria-label="Telefone" type="tel" numeric defaultValue={data.phone ? formatPhone(data.phone) : ""} placeholder="DDD + número" onBlur={(event) => close(saveContact("phone", event.currentTarget.value))} />}</InlineField>
            </div> }, { value: "relationship", title: "Relacionamento", content: <div className={layout.fields}>
              <ScoreGauge value={data.scoreCalculatedAt && data.scoreHasEvidence ? data.score : null} previousValue={data.scorePreviousWeek ?? null} />
              <InlineField label="Etapa do relacionamento" value={LEAD_STATUS_OPTIONS.find((option) => option.value === data.leadStatus)?.label ?? data.leadStatus} disabled={!canWrite || busy}>{(close) => <Select label="Etapa do relacionamento" value={data.leadStatus} options={LEAD_STATUS_OPTIONS} onValueChange={(value) => { if (value) close(updateLifecycle("leadStatus", value)); }} />}</InlineField>
              <InlineField label="Origem" value={LEAD_SOURCE_OPTIONS.find((option) => option.value === data.source)?.label ?? data.source ?? "Sem origem"} empty={!data.source} disabled={!canWrite || busy}>{(close) => <Select label="Origem do lead" value={data.source} placeholder="Selecionar origem" options={LEAD_SOURCE_OPTIONS} onValueChange={(value) => close(updateLifecycle("source", value))} />}</InlineField>
              <InlineField label="Responsável" value={owner?.name ?? "Não atribuído"} empty={!owner} {...(owner ? { leading: <UserAvatar user={owner} size="small" /> } : {})} disabled={!canWrite || busy}>{(close) => <Select label="Responsável pelo lead" value={data.ownerId} placeholder="Não atribuído" options={users.filter((user) => !user.deactivatedAt).map(userSelectOption)} onValueChange={(value) => close(updateLifecycle("ownerId", value))} />}</InlineField>
              <InlineField label="Empresa" value={company?.name ?? "Não vinculada"} empty={!company} {...(company ? { leading: <Avatar name={company.name} size="small" />, action: { label: `Abrir ${company.name}`, icon: "eye" as const, onClick: () => void navigate(`/companies/${company.id}`) } } : {})} disabled={!canWrite || !canReadCompanies || busy}>{(close) => <Select label="Empresa da pessoa" value={data.companyId} placeholder="Não vinculada" options={companies.filter((item) => !item.deletedAt).map((item) => ({ value: item.id, label: item.name }))} onValueChange={(value) => close(updateLifecycle("companyId", value))} />}</InlineField>
            </div>
          }, { value: "custom", title: "Campos e grupos", content: <RecordCustomFields entityType="contact" entityId={data.id} disabled={!canWrite} onSave={(field,value) => writeAccepted((metadata) => collection.update(data.id, { metadata }, draft => { draft.customFields = { ...draft.customFields, [field.key]: value }; }))} /> }]} />
        </div>
        <div className={layout.personWork}>
          <Tabs fill={!embedded} label="Área de trabalho da pessoa" items={[
            ...(canReadActivities ? [{ value: "atividades", label: "Atividades", content: activitiesContent }] : []),
            ...(canReadDeals ? [{ value: "negocios", label: `Negócios (${deals.length})`, content: <Card title="Negócios" actions={canWriteDeals ? <Button size="sm" variant="secondary" onClick={() => void navigate(`/deals?createFor=${contactId}`)}>Novo negócio</Button> : undefined}>
            {deals.length === 0 ? <Text size="pequeno" tone="muted">Nenhum negócio desta pessoa.</Text> : <RowList label="Negócios desta pessoa">{deals.map((deal, index) => <ListRow key={deal.id} index={index} icon="briefcase" title={deal.name} description={deal.status === "open" ? "Em aberto" : deal.status === "won" ? <Signal tone="success">Ganho</Signal> : <Signal tone="danger">Perdido</Signal>} render={<Link to={`/deals/${deal.id}`} />} />)}</RowList>}
          </Card> }] : []),
            ...(canReadInbox ? [{ value: "conversas", label: `Conversas (${conversations.length})`, content: <Card title="Conversas">
            {conversations.length === 0 ? <Text size="pequeno" tone="muted">Nenhuma conversa desta pessoa.</Text> : <RowList label="Conversas desta pessoa">{conversations.map((conversation, index) => <ListRow key={conversation.id} index={index} icon="message" title={conversation.subject} description={conversation.channel === "email" ? "E-mail" : conversation.channel === "instagram" ? "Instagram" : conversation.channel === "whatsapp" ? "WhatsApp" : conversation.channel === "messenger" ? "Messenger" : "Interno"} render={<Link to={`/inbox?box=all&conversation=${conversation.id}`} />} />)}</RowList>}
          </Card> }] : []),
            { value: "score", label: "Score", content: <div className={layout.stack}>
              <DataChart title="Evolução do score" description="Até 90 dias · índice comercial de 0 a 1.000. Mudanças de modelo não são comparadas." data={scoreChart} series={[{ key: "score", label: "Score", color: 2 }]} />
              <Card title="O que compõe o score">{latestScore ? <RowList label="Contribuições do score">{latestScore.contributions.filter(item => item.points !== 0).map((item, index) => <ListRow key={item.ruleId} index={index} title={item.label} meta={`${item.points > 0 ? "+" : ""}${Math.round(item.points)} pontos`} />)}</RowList> : <Text tone="secondary">O histórico começa com o primeiro cálculo do motor.</Text>}</Card>
            </div> },
            { value: "historico", label: "Histórico", content: historyContent },
            { value: "canais", label: "Canais", content: <Card title="Canais e identidades">
            <div className={layout.stack}>
              {identities.length === 0 ? <Text size="pequeno" tone="muted">Nenhum canal adicional.</Text> : <div className={layout.fields}>{identities.map((identity) => <InlineField block key={identity.id} label={IDENTITY_CHANNEL_OPTIONS.find((option) => option.value === identity.channel)?.label ?? identity.channel} value={identity.channel === "instagram" ? `@${identity.externalValue}` : identity.externalValue} numeric={identity.channel === "phone" || identity.channel === "whatsapp"} />)}</div>}
              {canWrite && <Form className={layout.form} onSubmit={addIdentity}>
                <Field><Label>Tipo de canal</Label><Select label="Tipo de canal" value={identityChannel} options={IDENTITY_CHANNEL_OPTIONS} onValueChange={(value) => { if (value) setIdentityChannel(value as IdentityChannel); }} /></Field>
                <Field>
                  <Label>Identificador</Label>
                  <Input value={identityValue} onChange={(event) => setIdentityValue(event.target.value)} placeholder={identityChannel === "email" ? "nome@empresa.com" : identityChannel === "instagram" ? "@usuario" : "DDD + número"} />
                </Field>
                <div className={layout.formActions}><Button type="submit" size="sm" variant="secondary" loading={identityPending} disabled={!identityValue.trim()}>Adicionar canal</Button></div>
              </Form>}
            </div>
          </Card> },
          ]} />
        </div>
      </div>
    </div>
  );
}
