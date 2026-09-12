import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { availableCannedReplies, contactId, conversationId, conversationSlaState, messageId, teamId, userId, type Conversation, type ConversationChannel, type ConversationStatus } from "@spark/core";
import { inboxControllerSend } from "@spark/api-client";
import { optimisticConversation, optimisticInternalNote } from "@spark/data";
import { ActionModal, Badge, Button, Field, Icon, Label, SearchSelect, Select, Textarea, notify, type SelectOption } from "@spark/ui-web";
import { getSession } from "../lib/auth.client";
import { getContactsCollection } from "../lib/contacts-collection.client";
import { getConversationsCollection, getMessagesCollection } from "../lib/inbox-collections.client";
import { getCannedRepliesCollection } from "../lib/canned-replies-collection.client";
import { getTeamsCollection } from "../lib/teams-collection.client";
import { requireCapability } from "../lib/route-access.client";
import { getUsersCollection } from "../lib/users-collection.client";
import styles from "./inbox.module.css";

const CHANNELS: ReadonlyArray<{ value: ConversationChannel; label: string }> = [
  { value: "manual", label: "Manual" },
  { value: "email", label: "E-mail" },
  { value: "instagram", label: "Instagram" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "messenger", label: "Messenger" },
];

export async function clientLoader() {
  const session = await requireCapability("inbox:read");
  void Promise.allSettled([
    getConversationsCollection().preload(),
    getMessagesCollection().preload(),
    getUsersCollection().preload(),
    getCannedRepliesCollection().preload(),
    getTeamsCollection().preload(),
    ...(session.capabilities.includes("contacts:read") ? [getContactsCollection().preload()] : []),
  ]);
  return null;
}

export default function Inbox() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const session = getSession();
  const canWrite = session?.capabilities.includes("inbox:write") ?? false;
  const canReadContacts = session?.capabilities.includes("contacts:read") ?? false;
  const conversationsCollection = getConversationsCollection();
  const messagesCollection = getMessagesCollection();
  const { data: conversations, isLoading } = useLiveQuery({ query: (q) => q.from({ conversations: conversationsCollection }).orderBy(({ conversations: item }) => item.lastMessageAt, "desc") });
  const { data: contacts = [] } = useLiveQuery({ query: (q) => canReadContacts ? q.from({ contacts: getContactsCollection() }).orderBy(({ contacts: item }) => item.name, "asc") : undefined });
  const { data: users } = useLiveQuery({ query: (q) => q.from({ users: getUsersCollection() }).orderBy(({ users: item }) => item.name, "asc") });
  const { data: cannedReplies = [] } = useLiveQuery({ query: (q) => q.from({ replies: getCannedRepliesCollection() }).orderBy(({ replies: item }) => item.shortcut, "asc") });
  const { data: teams = [] } = useLiveQuery({ query: (q) => q.from({ teams: getTeamsCollection() }).orderBy(({ teams: item }) => item.name, "asc") });
  const filter = parseInboxFilter(searchParams.get("box"));
  const [mobileView, setMobileView] = useState<"list" | "thread">("list");
  const [now, setNow] = useState(() => new Date());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newConversationOpen, setNewConversationOpen] = useState(false);
  const [newContact, setNewContact] = useState<SelectOption | null>(null);
  const [newSubject, setNewSubject] = useState("");
  const [newChannel, setNewChannel] = useState<ConversationChannel>("manual");
  const [note, setNote] = useState("");
  const [composerMode, setComposerMode] = useState<"reply" | "note">("note");
  const [saving, setSaving] = useState(false);
  const contactNames = useMemo(() => new Map(contacts.map((item) => [item.id, item.name])), [contacts]);
  const userNames = useMemo(() => new Map(users.map((item) => [item.id, item.name])), [users]);
  const teamNames = useMemo(() => new Map(teams.map((item) => [item.id, item.name])), [teams]);
  const filtered = conversations.filter((item) => matchesFilter(item, filter, session?.userId ?? null));
  const selected = filtered.find((item) => item.id === selectedId) ?? filtered[0] ?? null;
  const usableReplies = availableCannedReplies(cannedReplies, selected?.teamId ?? null);
  const { data: messages = [] } = useLiveQuery({ query: (q) => selected ? q.from({ messages: messagesCollection }).where(({ messages: item }) => eq(item.conversationId, selected.id)).orderBy(({ messages: item }) => item.createdAt, "asc") : undefined });

  useEffect(() => {
    if (selected && selected.id !== selectedId) setSelectedId(selected.id);
  }, [selected, selectedId]);
  useEffect(() => { if (selected && selected.channel !== "email" && selected.channel !== "instagram" && composerMode === "reply") setComposerMode("note"); }, [composerMode, selected]);
  useEffect(() => { const timer = window.setInterval(() => setNow(new Date()), 60_000); return () => window.clearInterval(timer); }, []);

  async function createConversation() {
    if (!session || !newContact || !newSubject.trim()) throw new Error("MISSING_FIELDS");
    const conversation = optimisticConversation({ contactId: contactId.from(newContact.value), channel: newChannel, subject: newSubject.trim() }, session.orgId, userId.from(session.userId));
    const transaction = conversationsCollection.insert(conversation);
    await transaction.isPersisted.promise;
    setSelectedId(conversation.id);
    setNewContact(null);
    setNewSubject("");
    setNewChannel("manual");
    notify({ title: "Conversa criada", description: conversation.subject, tone: "success" });
  }

  async function updateConversation(changes: Partial<Pick<Conversation, "status" | "priority" | "assigneeId" | "teamId">>) {
    if (!selected || saving) return;
    setSaving(true);
    try {
      const transaction = conversationsCollection.update(selected.id, (draft) => {
        if (changes.status !== undefined) draft.status = changes.status;
        if (changes.priority !== undefined) draft.priority = changes.priority;
        if (changes.assigneeId !== undefined) draft.assigneeId = changes.assigneeId;
        if (changes.teamId !== undefined) draft.teamId = changes.teamId;
      });
      await transaction.isPersisted.promise;
    } catch {
      notify({ title: "Não foi possível atualizar a conversa", tone: "error" });
    } finally { setSaving(false); }
  }

  async function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = note.trim();
    if (!session || !selected || !body || saving) return;
    setSaving(true);
    try {
      if (composerMode === "reply") await inboxControllerSend(selected.id, { id: messageId.create(), body });
      else { const message = optimisticInternalNote({ conversationId: conversationId.from(selected.id), contactId: selected.contactId, authorUserId: userId.from(session.userId), body }, session.orgId); const transaction = messagesCollection.insert(message); await transaction.isPersisted.promise; }
      setNote("");
      notify({ title: composerMode === "reply" ? "Mensagem enviada" : "Nota adicionada", tone: "success" });
    } catch {
      notify({ title: composerMode === "reply" ? "Não foi possível enviar a mensagem" : "Não foi possível adicionar a nota", tone: "error" });
    } finally { setSaving(false); }
  }

  return <div className={styles.page}>
    <div className={styles.workspace} data-mobile-view={mobileView}>
      <section className={styles.conversationList} aria-label="Lista de conversas">
        {teams.some((team) => !team.archivedAt) && <div className={styles.filters} aria-label="Filtrar por equipe">
          {teams.filter((team) => !team.archivedAt).map((team) => <FilterButton key={team.id} active={filter === `team:${team.id}`} count={conversations.filter((item) => item.status === "open" && item.teamId === team.id).length} onClick={() => setSearchParams({ box: `team:${team.id}` })}>{team.name}</FilterButton>)}
        </div>}
        <header><strong>{filterLabel(filter)}</strong><span>{filtered.length}</span>{canWrite && canReadContacts && <Button iconOnly size="sm" variant="ghost" aria-label="Nova conversa" onClick={() => setNewConversationOpen(true)}><Icon name="plus" /></Button>}</header>
        <div className={styles.listBody}>
          {isLoading && conversations.length === 0 && <p className={styles.empty}>Carregando conversas…</p>}
          {!isLoading && filtered.length === 0 && <p className={styles.empty}>Nenhuma conversa nesta caixa.</p>}
          {filtered.map((item) => <Button key={item.id} variant="ghost" shape="rounded" className={styles.conversationButton} data-selected={selected?.id === item.id || undefined} onClick={() => { setSelectedId(item.id); setMobileView("thread"); }}>
            <span className={styles.avatar}>{initials(contactNames.get(item.contactId) ?? "Contato")}</span>
            <span className={styles.preview}><span><strong>{contactNames.get(item.contactId) ?? "Contato"}</strong><time>{relativeTime(item.lastMessageAt)}</time></span><b>{item.subject}</b><small>{channelLabel(item.channel)} · {item.teamId ? teamNames.get(item.teamId) ?? "Equipe" : item.assigneeId ? userNames.get(item.assigneeId) ?? "Responsável" : "Não atribuída"}</small><SlaBadge conversation={item} now={now} /></span>
            {item.priority === "priority" && <Icon name="star" />}
          </Button>)}
        </div>
      </section>

      <section className={styles.thread} aria-label="Conversa selecionada">
        {selected ? <>
          <header className={styles.threadHeader}>
            <Button type="button" size="sm" variant="ghost" className={styles.mobileBack} onClick={() => setMobileView("list")}>Conversas</Button>
            <div><strong>{selected.subject}</strong><span>{contactNames.get(selected.contactId) ?? "Contato"} · {channelLabel(selected.channel)}</span></div>
            <div className={styles.threadActions}>
              <Button iconOnly size="sm" variant={selected.priority === "priority" ? "raised" : "ghost"} aria-label={selected.priority === "priority" ? "Remover prioridade" : "Marcar como prioridade"} disabled={!canWrite || saving} onClick={() => void updateConversation({ priority: selected.priority === "priority" ? "normal" : "priority" })}><Icon name="star" /></Button>
              <Button size="sm" variant="secondary" disabled={!canWrite || saving} onClick={() => void updateConversation({ status: selected.status === "closed" ? "open" : "closed" })}>{selected.status === "closed" ? "Reabrir" : "Fechar"}</Button>
            </div>
          </header>
          <div className={styles.messages}>
            {messages.length === 0 && <div className={styles.threadEmpty}><Icon name="message" /><strong>Conversa iniciada</strong><span>Adicione uma nota interna para registrar o contexto do atendimento.</span></div>}
            {messages.map((message) => <article key={message.id} className={styles.message} data-direction={message.direction}>
              <header><strong>{message.direction === "internal" ? (message.authorUserId ? userNames.get(message.authorUserId) : null) ?? "Equipe" : message.direction === "inbound" ? contactNames.get(message.contactId) ?? "Contato" : "Equipe"}</strong><time>{formatDateTime(message.createdAt)}</time></header>
              <p>{message.body}</p>
              <small>{message.direction === "internal" ? "Nota interna" : message.status}</small>
            </article>)}
          </div>
          {canWrite && <form className={styles.composer} onSubmit={submitMessage}>
            <div className={styles.composerMode}><div className={styles.modeButtons}>{(selected.channel === "email" || selected.channel === "instagram") && <Button type="button" size="sm" variant={composerMode === "reply" ? "raised" : "ghost"} onClick={() => setComposerMode("reply")}>Responder</Button>}<Button type="button" size="sm" variant={composerMode === "note" ? "raised" : "ghost"} onClick={() => setComposerMode("note")}>Nota</Button></div><Badge tone={composerMode === "note" ? "warning" : "success"}>{composerMode === "note" ? "Somente equipe" : channelLabel(selected.channel)}</Badge></div>
            <Textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder={composerMode === "reply" ? `Responder pelo ${channelLabel(selected.channel)}…` : "Adicione contexto, orientação ou acompanhamento…"} rows={3} />
            <div className={styles.replyTools}><SearchSelect label="Inserir resposta pronta" searchPlacement="dropdown" placeholder="Respostas prontas" options={usableReplies.map((reply) => ({ value: reply.id, label: `/${reply.shortcut} · ${reply.title}`, description: reply.body }))} value={null} onValueChange={(option) => { const reply = usableReplies.find((item) => item.id === option?.value); if (reply) setNote((current) => current ? `${current}\n${reply.body}` : reply.body); }} /><Button type="button" size="sm" variant="ghost" onClick={() => navigate("/inbox/replies")}>Gerenciar respostas</Button></div>
            <div className={styles.composerFooter}><span>{note.length}/20.000</span><Button type="submit" loading={saving} disabled={!note.trim()}>{composerMode === "reply" ? "Enviar mensagem" : "Adicionar nota"}</Button></div>
          </form>}
        </> : <div className={styles.threadEmpty}><Icon name="message" /><strong>Selecione uma conversa</strong><span>O histórico completo aparecerá aqui.</span></div>}
      </section>

      <aside className={styles.details}>
        <h2>Detalhes</h2>
        {selected ? <>
          <div className={styles.contactCard}><span className={styles.avatarLarge}>{initials(contactNames.get(selected.contactId) ?? "Contato")}</span><strong>{contactNames.get(selected.contactId) ?? "Contato"}</strong><span>{channelLabel(selected.channel)}</span></div>
          <Field><Label>Responsável</Label><Select label="Responsável pela conversa" value={selected.assigneeId} options={[{ value: "", label: "Não atribuído" }, ...users.filter((item) => !item.deactivatedAt).map((item) => ({ value: item.id, label: item.name }))]} onValueChange={(value) => void updateConversation({ assigneeId: value ? userId.from(value) : null })} disabled={!canWrite || saving} /></Field>
          <Field><Label>Equipe</Label><Select label="Equipe responsável" value={selected.teamId} options={[{ value: "", label: "Sem equipe" }, ...teams.filter((item) => !item.archivedAt).map((item) => ({ value: item.id, label: item.name }))]} onValueChange={(value) => void updateConversation({ teamId: value ? teamId.from(value) : null })} disabled={!canWrite || saving} /></Field>
          <dl className={styles.metadata}><div><dt>Situação</dt><dd>{statusLabel(selected.status)}</dd></div><div><dt>Prioridade</dt><dd>{selected.priority === "priority" ? "Prioritária" : "Normal"}</dd></div><div><dt>Primeira resposta</dt><dd><SlaBadge conversation={selected} now={now} /></dd></div><div><dt>Criada em</dt><dd>{formatDateTime(selected.createdAt)}</dd></div></dl>
          {canReadContacts && <Button variant="secondary" onClick={() => navigate(`/contacts/${selected.contactId}`)}>Abrir contato</Button>}
        </> : null}
      </aside>
    </div>

    <ActionModal open={newConversationOpen} onOpenChange={setNewConversationOpen} title="Nova conversa" confirmLabel="Criar conversa" errorText="Selecione um contato e informe o assunto." onConfirm={createConversation}>
      <div className={styles.modalFields}>
        <Field><Label>Contato</Label><SearchSelect label="Buscar contato" searchPlacement="dropdown" placeholder="Selecionar contato" options={contacts.filter((item) => !item.deletedAt).map((item) => ({ value: item.id, label: item.name, ...(item.email ? { description: item.email } : {}) }))} value={newContact} onValueChange={setNewContact} /></Field>
        <Field><Label>Canal de origem</Label><Select label="Canal de origem" value={newChannel} options={CHANNELS} onValueChange={(value) => { if (value) setNewChannel(value as ConversationChannel); }} /></Field>
        <Field><Label>Assunto</Label><Textarea value={newSubject} onChange={(event) => setNewSubject(event.target.value)} placeholder="Descreva o motivo do contato" rows={2} maxLength={300} /></Field>
      </div>
    </ActionModal>
  </div>;
}

function FilterButton({ active, count, children, onClick }: { active: boolean; count: number; children: string; onClick: () => void }) {
  return <Button variant="ghost" shape="rounded" className={styles.filterButton} data-selected={active || undefined} onClick={onClick}><span>{children}</span><b>{count}</b></Button>;
}
type InboxFilter = ConversationStatus | "all" | "mine" | "unassigned" | `team:${string}`;
function parseInboxFilter(value: string | null): InboxFilter {
  if (value === "all" || value === "mine" || value === "unassigned" || value === "closed" || value === "snoozed") return value;
  if (value?.startsWith("team:")) return value as `team:${string}`;
  return "open";
}
function matchesFilter(item: Conversation, filter: InboxFilter, currentUserId: string | null): boolean {
  if (filter === "all") return true;
  if (filter === "mine") return item.status === "open" && item.assigneeId === currentUserId;
  if (filter === "unassigned") return item.status === "open" && item.assigneeId === null;
  if (filter.startsWith("team:")) return item.status === "open" && item.teamId === filter.slice(5);
  return item.status === filter;
}
function filterLabel(value: InboxFilter): string { if (value.startsWith("team:")) return "Fila da equipe"; if (value === "open") return "Abertas"; if (value === "mine") return "Minhas conversas"; if (value === "unassigned") return "Não atribuídas"; if (value === "snoozed") return "Adiadas"; if (value === "closed") return "Fechadas"; return "Todas"; }
function channelLabel(value: ConversationChannel): string { return CHANNELS.find((item) => item.value === value)?.label ?? value; }
function statusLabel(value: ConversationStatus): string { return ({ open: "Aberta", snoozed: "Adiada", closed: "Fechada" })[value]; }
function initials(value: string): string { return value.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase(); }
function formatDateTime(value: string): string { return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)); }
function relativeTime(value: string): string { const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60_000)); return minutes < 1 ? "agora" : minutes < 60 ? `${minutes} min` : minutes < 1_440 ? `${Math.floor(minutes / 60)} h` : `${Math.floor(minutes / 1_440)} d`; }
function SlaBadge({ conversation, now }: { conversation: Conversation; now: Date }) { const state = conversationSlaState(conversation.firstResponseDueAt, conversation.firstRespondedAt, now); const labels = { met: "Respondida no prazo", on_track: `SLA ${timeUntil(conversation.firstResponseDueAt, now)}`, due_soon: `SLA ${timeUntil(conversation.firstResponseDueAt, now)}`, breached: "SLA vencido" }; return <Badge tone={state === "met" ? "success" : state === "breached" ? "danger" : state === "due_soon" ? "warning" : "neutral"}>{labels[state]}</Badge>; }
function timeUntil(value: string, now: Date): string { const minutes = Math.ceil((new Date(value).getTime() - now.getTime()) / 60_000); if (minutes <= 0) return "vencido"; if (minutes < 60) return `${minutes} min`; return `${Math.ceil(minutes / 60)} h`; }
