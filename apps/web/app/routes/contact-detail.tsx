import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router";
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
import { optimisticActivity, optimisticIdentity } from "@spark/data";
import { BackLink, Button, DateTimePicker, ErrorText, Field, Input, Label, RecordPageHeader, Select, Skeleton, Timeline, notify } from "@spark/ui-web";
import type { Route } from "./+types/contact-detail";
import { getContactsCollection } from "../lib/contacts-collection.client";
import { getActivitiesCollection } from "../lib/activities-collection.client";
import { getUsersCollection } from "../lib/users-collection.client";
import { getCompaniesCollection } from "../lib/companies-collection.client";
import { getDealsCollection } from "../lib/deals-collections.client";
import { getConversationsCollection } from "../lib/inbox-collections.client";
import { getEventsCollection } from "../lib/events-collection.client";
import { toTimelineItem } from "../lib/event-presentation";
import { getIdentitiesCollection } from "../lib/identities-collection.client";
import { LEAD_SOURCE_OPTIONS, LEAD_STATUS_OPTIONS } from "../lib/lead-options";
import { getSession } from "../lib/auth.client";
import { requireCapability } from "../lib/route-access.client";
import styles from "./contact-detail.module.css";
import layout from "./contact-profile-layout.module.css";
import { getCustomFieldsCollection } from "../lib/custom-fields-collection.client";
import { getCustomFieldOptionsCollection, getCustomFieldValuesCollection } from "../lib/custom-field-data.client";
import { useCustomFieldOptions, useCustomFieldValues } from "../lib/custom-fields.client";
import { PreviewedCustomFieldValue } from "../lib/link-previews.client";

export async function clientLoader() {
  const session = await requireCapability("contacts:read");
  void Promise.allSettled([
    getContactsCollection().preload(),
    getUsersCollection().preload(),
    getEventsCollection().preload(),
    getIdentitiesCollection().preload(),
    getCustomFieldsCollection().preload(),
    getCustomFieldValuesCollection().preload(),
    getCustomFieldOptionsCollection().preload(),
    ...(session.capabilities.includes("activities:read") ? [getActivitiesCollection().preload()] : []),
    ...(session.capabilities.includes("companies:read") ? [getCompaniesCollection().preload()] : []),
    ...(session.capabilities.includes("deals:read") ? [getDealsCollection().preload()] : []),
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
 * `embedded` some com o link de voltar: dentro do painel, voltar levaria para
 * fora do negócio — que é justamente o que o painel evita.
 */
export function ContactProfile({ contactId, embedded = false }: { contactId: string; embedded?: boolean }) {
  const navigate = useNavigate();
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
  const [activityPending, setActivityPending] = useState(false);
  const [contactFieldPending, setContactFieldPending] = useState<string | null>(null);
  const [identityChannel, setIdentityChannel] = useState<IdentityChannel>("email");
  const [identityValue, setIdentityValue] = useState("");
  const [identityPending, setIdentityPending] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [nameEdit, setNameEdit] = useState("");
  const [emailEdit, setEmailEdit] = useState("");
  const [phoneEdit, setPhoneEdit] = useState("");
  const [emailEditError, setEmailEditError] = useState<string | null>(null);
  const [phoneEditError, setPhoneEditError] = useState<string | null>(null);

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
  const { data: events } = useLiveQuery({ query: (q) => q.from({ events: getEventsCollection() }).where(({ events: item }) => eq(item.contactId, contactId)).orderBy(({ events: item }) => item.occurredAt, "desc") });
  const { data: identities } = useLiveQuery({ query: (q) => q.from({ identities: getIdentitiesCollection() }).where(({ identities: item }) => eq(item.contactId, contactId)).orderBy(({ identities: item }) => item.createdAt, "asc") });
  const { data: customFields } = useLiveQuery({ query: (q) => q.from({ fields: getCustomFieldsCollection() }).where(({ fields: item }) => eq(item.entityType, "contact")).orderBy(({ fields: item }) => item.label, "asc") });
  // Valores vindos das colunas tipadas, não do jsonb (ADR-0035).
  const customValues = useCustomFieldValues("contact", contactId, customFields);
  const fieldOptions = useCustomFieldOptions();
  const { data: deals = [] } = useLiveQuery({ query: (q) => canReadDeals ? q.from({ deals: getDealsCollection() }).where(({ deals: item }) => eq(item.contactId, contactId)).orderBy(({ deals: item }) => item.updatedAt, "desc") : undefined });
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
      const transaction = collection.update(data.id, (draft) => {
        if (field === "leadStatus") draft.leadStatus = value as typeof draft.leadStatus;
        if (field === "source") draft.source = value;
        if (field === "ownerId") draft.ownerId = value ? userIdFactory.from(value) : null;
        if (field === "companyId") draft.companyId = value ? companyIdFactory.from(value) : null;
      });
      await transaction.isPersisted.promise;
      notify({ title: "Lead atualizado", tone: "success" });
    } catch {
      notify({ title: "Não foi possível atualizar o lead", tone: "error" });
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

  function startEditing() {
    if (!data) return;
    setNameEdit(data.name);
    setEmailEdit(data.email ?? "");
    setPhoneEdit(data.phone ? formatPhone(data.phone) : "");
    setEmailEditError(null);
    setPhoneEditError(null);
    setIsEditing(true);
  }

  function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!data) return;
    const trimmedName = nameEdit.trim();
    if (!trimmedName) return;

    setEmailEditError(null);
    setPhoneEditError(null);

    let validEmail = null;
    try {
      validEmail = emailEdit.trim() ? buildEmail(emailEdit) : null;
    } catch {
      setEmailEditError("E-mail inválido.");
      return;
    }

    let validPhone = null;
    try {
      validPhone = phoneEdit.trim() ? buildPhone(phoneEdit) : null;
    } catch {
      setPhoneEditError("Telefone inválido — use DDD + número.");
      return;
    }

    collection.update(data.id, (draft) => {
      draft.name = trimmedName;
      draft.email = validEmail;
      draft.phone = validPhone;
    });
    setIsEditing(false);
  }

  if (!data) {
    return (
      <div className={layout.page}>
        {!embedded && <BackLink render={<Link to="/" />}>Pessoas</BackLink>}
        {isLoading ? <div className={layout.loading} role="status" aria-label="Carregando pessoa"><Skeleton /><Skeleton /><Skeleton /></div> : <p>Pessoa não encontrada.</p>}
      </div>
    );
  }

  return (
    <div className={layout.page}>
      <RecordPageHeader back={embedded ? null : <BackLink render={<Link to="/" />}>Pessoas</BackLink>} icon="user" avatarName={data.name} eyebrow="Pessoa" title={data.name} description={`${data.email ?? "Sem e-mail"} · ${data.phone ? formatPhone(data.phone) : "Sem telefone"}`} actions={(canWrite && !isEditing) || canWriteInbox ? <>{canWrite && !isEditing && <Button variant="secondary" onClick={startEditing}>Editar pessoa</Button>}{canWriteInbox && <Button onClick={() => void navigate(`/inbox?box=all&createFor=${contactId}`)}>Nova conversa</Button>}</> : undefined} metrics={[{ label: "Pontuação", value: data.score, icon: "star" }, { label: "Etapa", value: LEAD_STATUS_OPTIONS.find((option) => option.value === data.leadStatus)?.label ?? data.leadStatus, icon: "check" }, { label: "Empresa", value: companies.find((company) => company.id === data.companyId)?.name ?? "Não vinculada", icon: "building" }]} />
      <div className={layout.contentGrid}>
        <div className={layout.profileColumn}>
      <h2 className={layout.columnTitle}>Detalhes</h2>
      {isEditing ? (
        <form className={styles.campos} onSubmit={saveEdit}>
          <Field>
            <Label>Nome</Label>
            <Input value={nameEdit} onChange={(event) => setNameEdit(event.target.value)} />
          </Field>
          <Field invalid={!!emailEditError}>
            <Label>E-mail</Label>
            <Input
              value={emailEdit}
              onChange={(event) => {
                setEmailEdit(event.target.value);
                setEmailEditError(null);
              }}
              placeholder="opcional"
            />
            <ErrorText>{emailEditError}</ErrorText>
          </Field>
          <Field invalid={!!phoneEditError}>
            <Label>Telefone</Label>
            <Input
              value={phoneEdit}
              onChange={(event) => {
                setPhoneEdit(event.target.value);
                setPhoneEditError(null);
              }}
              placeholder="opcional"
            />
            <ErrorText>{phoneEditError}</ErrorText>
          </Field>
          <div className={styles.acoesEdicao}>
            <Button type="submit" size="sm" disabled={!nameEdit.trim()}>
              Salvar
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => setIsEditing(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      ) : (
        <div className={styles.campos}>
          <div className={styles.campo}>
            <span className={styles.rotulo}>E-mail</span>
            <span className={styles.valor}>{data.email ?? "—"}</span>
          </div>
          <div className={styles.campo}>
            <span className={styles.rotulo}>Telefone</span>
            <span className={styles.valor}>{data.phone ? formatPhone(data.phone) : "—"}</span>
          </div>
          <div className={styles.campo}>
            <span className={styles.rotulo}>Pontuação</span>
            <span className={styles.valor}>{data.score}</span>
          </div>
        </div>
      )}

      <div className={styles.campos}>
        <div className={styles.campo}>
          <span className={styles.rotulo}>Etapa do relacionamento</span>
          <Select label="Etapa do relacionamento" value={data.leadStatus} options={LEAD_STATUS_OPTIONS} disabled={!canWrite || contactFieldPending !== null} onValueChange={(value) => { if (value) void updateLifecycle("leadStatus", value); }} />
        </div>
        <div className={styles.campo}>
          <span className={styles.rotulo}>Origem</span>
          <Select label="Origem do lead" value={data.source} placeholder="Selecionar origem" options={LEAD_SOURCE_OPTIONS} disabled={!canWrite || contactFieldPending !== null} onValueChange={(value) => void updateLifecycle("source", value)} />
        </div>
        <div className={styles.campo}>
          <span className={styles.rotulo}>Responsável</span>
          <Select label="Responsável pelo lead" value={data.ownerId} placeholder="Não atribuído" options={users.filter((user) => !user.deactivatedAt).map((user) => ({ value: user.id, label: user.name, avatar: user.avatarUrl }))} disabled={!canWrite || contactFieldPending !== null} onValueChange={(value) => void updateLifecycle("ownerId", value)} />
        </div>
        <div className={styles.campo}>
          <span className={styles.rotulo}>Empresa</span>
          <Select label="Empresa da pessoa" value={data.companyId} placeholder="Não vinculada" options={companies.filter((company) => !company.deletedAt).map((company) => ({ value: company.id, label: company.name }))} disabled={!canWrite || !canReadCompanies || contactFieldPending !== null} onValueChange={(value) => void updateLifecycle("companyId", value)} />
        </div>
      </div>

      {customFields.filter((field) => !field.archivedAt).length > 0 && <section className={styles.atividades}>
        <h2 className={styles.subtitulo}>Campos personalizados</h2>
        <div className={styles.campos}>
          {customFields.filter((field) => !field.archivedAt).map((field) => <PreviewedCustomFieldValue key={field.id} field={field} options={fieldOptions.get(field.id) ?? []} value={customValues[field.key]} disabled={!canWrite} onSave={async (value) => { const transaction = collection.update(data.id, (draft) => { draft.customFields = { ...draft.customFields, [field.key]: value }; }); await transaction.isPersisted.promise; }} onError={(message) => notify({ title: "Valor inválido", description: message, tone: "error" })} />)}
        </div>
      </section>}

        </div>
        <div className={layout.workColumn}>
      {canReadDeals && <section className={styles.atividades}>
        <div className={styles.sectionHeading}><h2 className={styles.subtitulo}>Negócios</h2>{canWriteDeals && <Button size="sm" variant="secondary" onClick={() => void navigate(`/deals?createFor=${contactId}`)}>Novo negócio</Button>}</div>
        {deals.length === 0 ? <span className={styles.valor}>Nenhum negócio desta pessoa.</span> : <ul className={styles.listaAtividades}>{deals.map((deal) => <li key={deal.id} className={styles.atividade}><Link className={layout.recordLink} to={`/deals/${deal.id}`}><strong>{deal.name}</strong><span>{deal.status === "open" ? "Em aberto" : deal.status === "won" ? "Ganho" : "Perdido"}</span></Link></li>)}</ul>}
      </section>}
      {canReadInbox && <section className={styles.atividades}>
        <div className={styles.sectionHeading}><h2 className={styles.subtitulo}>Conversas</h2></div>
        {conversations.length === 0 ? <span className={styles.valor}>Nenhuma conversa desta pessoa.</span> : <ul className={styles.listaAtividades}>{conversations.map((conversation) => <li key={conversation.id} className={styles.atividade}><Link className={layout.recordLink} to={`/inbox?box=all&conversation=${conversation.id}`}><strong>{conversation.subject}</strong><span>{conversation.channel === "email" ? "E-mail" : conversation.channel === "instagram" ? "Instagram" : conversation.channel === "whatsapp" ? "WhatsApp" : conversation.channel === "messenger" ? "Messenger" : "Interno"}</span></Link></li>)}</ul>}
      </section>}
      <section className={styles.atividades}>
        <h2 className={styles.subtitulo}>Histórico</h2>
        <Timeline items={events.map(toTimelineItem)} emptyText="As próximas alterações desta pessoa aparecerão aqui." />
      </section>

      {canReadActivities && <section className={styles.atividades}>
        <h2 className={styles.subtitulo}>Atividades</h2>

        <ul className={styles.listaAtividades}>
          {activities.map((activity) => (
            <li
              key={activity.id}
              className={[styles.atividade, activity.completed ? styles.atividadeConcluida : ""]
                .filter(Boolean)
                .join(" ")}
            >
              <div className={styles.atividadeInfo}>
                <span className={styles.atividadeTipo}>
                  {TYPES.find((t) => t.value === activity.type)?.label ?? activity.type}
                </span>
                <span className={styles.atividadeTitulo}>{activity.title}</span>
                <span className={styles.atividadeData}>{formatDateTime(activity.scheduledAt)}</span>
              </div>
              {canWriteActivities && <Button
                variant="ghost"
                size="sm"
                onClick={() => void toggleCompleted(activity.id, activity.title, !activity.completed)}
              >
                {activity.completed ? "Reabrir" : "Concluir"}
              </Button>}
            </li>
          ))}
        </ul>

        {canWriteActivities && <form className={styles.formAtividade} onSubmit={addActivity}>
          <div className={styles.tipoLinha}>
            {TYPES.map((option) => (
              <Button
                key={option.value}
                type="button"
                size="sm"
                variant={selectedType === option.value ? "primary" : "secondary"}
                onClick={() => setSelectedType(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
          <Field>
            <Label>Título</Label>
            <Input value={activityTitle} onChange={(event) => setActivityTitle(event.target.value)} placeholder="O que precisa ser feito" />
          </Field>
          <Field>
            <Label>Quando</Label>
            <DateTimePicker label="Data e hora da atividade" mode="datetime" value={scheduledAt} onValueChange={setScheduledAt} placeholder="Selecionar data e hora" />
          </Field>
          <Button type="submit" size="sm" loading={activityPending} disabled={!activityTitle.trim() || !scheduledAt}>
            Adicionar atividade
          </Button>
        </form>}
      </section>}
        </div>
        <div className={layout.identityColumn}>
      <section className={styles.atividades}>
        <h2 className={styles.subtitulo}>Canais e identidades</h2>
        <div className={styles.campos}>
          {identities.length === 0 ? <span className={styles.valor}>Nenhum canal adicional.</span> : identities.map((identity) => (
            <div key={identity.id} className={styles.campo}>
              <span className={styles.rotulo}>{IDENTITY_CHANNEL_OPTIONS.find((option) => option.value === identity.channel)?.label ?? identity.channel}</span>
              <span className={styles.valor}>{identity.channel === "instagram" ? `@${identity.externalValue}` : identity.externalValue}</span>
            </div>
          ))}
          {canWrite && <form className={styles.formAtividade} onSubmit={addIdentity}>
            <Select label="Tipo de canal" value={identityChannel} options={IDENTITY_CHANNEL_OPTIONS} onValueChange={(value) => { if (value) setIdentityChannel(value as IdentityChannel); }} />
            <Field>
              <Label>Identificador</Label>
              <Input value={identityValue} onChange={(event) => setIdentityValue(event.target.value)} placeholder={identityChannel === "email" ? "nome@empresa.com" : identityChannel === "instagram" ? "@usuario" : "DDD + número"} />
            </Field>
            <Button type="submit" size="sm" loading={identityPending} disabled={!identityValue.trim()}>Adicionar canal</Button>
          </form>}
        </div>
      </section>

        </div>
      </div>
    </div>
  );
}
