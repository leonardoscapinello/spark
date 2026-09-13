import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { availableCannedReplies, contactId, conversationId, conversationSlaState, formatPhone, messageId, teamId, userId, type Conversation, type ConversationChannel, type ConversationStatus } from "@spark/core";
import { inboxControllerSend } from "@spark/api-client";
import { optimisticConversation, optimisticInternalNote } from "@spark/data";
import { Accordion, ActionModal, Avatar, Badge, Button, DataTable, Field, Icon, Input, Label, MenuButton, MenuGroup, MenuItem, Modal, ModalContent, SearchSelect, Select, Sidebar, SidebarItem, SidebarSection, TableIconAction, Tabs, Textarea, notify, type SelectOption, type TableColumn } from "@spark/ui-web";
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
  const canReadIntegrations = session?.capabilities.includes("integrations:read") ?? false;
  const conversationsCollection = getConversationsCollection();
  const messagesCollection = getMessagesCollection();
  const { data: conversations, isLoading } = useLiveQuery({ query: (q) => q.from({ conversations: conversationsCollection }).orderBy(({ conversations: item }) => item.lastMessageAt, "desc") });
  const { data: contacts = [] } = useLiveQuery({ query: (q) => canReadContacts ? q.from({ contacts: getContactsCollection() }).orderBy(({ contacts: item }) => item.name, "asc") : undefined });
  const { data: users } = useLiveQuery({ query: (q) => q.from({ users: getUsersCollection() }).orderBy(({ users: item }) => item.name, "asc") });
  const { data: cannedReplies = [] } = useLiveQuery({ query: (q) => q.from({ replies: getCannedRepliesCollection() }).orderBy(({ replies: item }) => item.shortcut, "asc") });
  const { data: teams = [] } = useLiveQuery({ query: (q) => q.from({ teams: getTeamsCollection() }).orderBy(({ teams: item }) => item.name, "asc") });
  const filter = parseInboxFilter(searchParams.get("box"));
  const [mobileView, setMobileView] = useState<"list" | "thread">("list");
  const [layout, setLayout] = useState<"chat" | "table">("chat");
  const activeQueueLink = useRef<HTMLAnchorElement>(null);
  const [now, setNow] = useState(() => new Date());
  const [selectedId, setSelectedId] = useState<string | null>(() => searchParams.get("conversation"));
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState<"recent" | "oldest">("recent");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [newConversationOpen, setNewConversationOpen] = useState(false);
  const [newContact, setNewContact] = useState<SelectOption | null>(null);
  const [newSubject, setNewSubject] = useState("");
  const [newChannel, setNewChannel] = useState<ConversationChannel>("manual");
  const [note, setNote] = useState("");
  const [composerMode, setComposerMode] = useState<"reply" | "note">("note");
  const [quickRepliesOpen, setQuickRepliesOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const contactNames = useMemo(() => new Map(contacts.map((item) => [item.id, item.name])), [contacts]);
  const userNames = useMemo(() => new Map(users.map((item) => [item.id, item.name])), [users]);
  const teamNames = useMemo(() => new Map(teams.map((item) => [item.id, item.name])), [teams]);
  const searchTerm = search.trim().toLocaleLowerCase("pt-BR");
  const firstRun = !isLoading && conversations.length === 0 && !searchTerm && (filter === "open" || filter === "all");
  const filtered = conversations.filter((item) => matchesFilter(item, filter, session?.userId ?? null)
    && (!searchTerm || [item.subject, contactNames.get(item.contactId), channelLabel(item.channel), item.teamId ? teamNames.get(item.teamId) : null]
      .some((value) => value?.toLocaleLowerCase("pt-BR").includes(searchTerm))))
    .sort((a, b) => sortOrder === "recent" ? b.lastMessageAt.localeCompare(a.lastMessageAt) : a.lastMessageAt.localeCompare(b.lastMessageAt));
  const selected = filtered.find((item) => item.id === selectedId) ?? filtered[0] ?? null;
  const usableReplies = availableCannedReplies(cannedReplies, selected?.teamId ?? null);
  const queueCounts = useMemo(() => {
    const counts = new Map<InboxFilter, number>();
    const increment = (box: InboxFilter) => counts.set(box, (counts.get(box) ?? 0) + 1);
    for (const conversation of conversations) {
      increment("all");
      increment(conversation.status);
      if (conversation.status !== "open") continue;
      if (conversation.assigneeId === session?.userId) increment("mine");
      if (conversation.assigneeId === null) increment("unassigned");
      if (conversation.teamId) increment(`team:${conversation.teamId}`);
    }
    return counts;
  }, [conversations, session?.userId]);
  const queueCount = (box: InboxFilter) => queueCounts.get(box) ?? 0;
  const tableColumns: TableColumn<Conversation>[] = [
    { id: "subject", label: "Conversa", cell: (item) => <Button size="sm" variant="ghost" className={styles.tableSubject} onClick={() => { setSelectedId(item.id); setMobileView("thread"); }}>{item.subject}</Button>, sortValue: (item) => item.subject },
    { id: "contact", label: "Pessoa", cell: (item) => contactNames.get(item.contactId) ?? "Pessoa", sortValue: (item) => contactNames.get(item.contactId) ?? "" },
    { id: "channel", label: "Canal", cell: (item) => channelLabel(item.channel), sortValue: (item) => channelLabel(item.channel) },
    { id: "assignee", label: "Responsável", cell: (item) => item.assigneeId ? userNames.get(item.assigneeId) ?? "Responsável" : "Não atribuída", sortValue: (item) => item.assigneeId ? userNames.get(item.assigneeId) ?? "" : "" },
    { id: "status", label: "Situação", cell: (item) => statusLabel(item.status), sortValue: (item) => statusLabel(item.status) },
    { id: "updated", label: "Última atividade", cell: (item) => relativeTime(item.lastMessageAt), sortValue: (item) => item.lastMessageAt },
  ];
  const queues = [
    { label: "Abertas", box: "open" as const, to: "/inbox", icon: "inbox" as const },
    { label: "Minhas conversas", box: "mine" as const, to: "/inbox?box=mine", icon: "user" as const },
    { label: "Não atribuídas", box: "unassigned" as const, to: "/inbox?box=unassigned", icon: "team" as const },
    { label: "Adiadas", box: "snoozed" as const, to: "/inbox?box=snoozed", icon: "calendar" as const },
    { label: "Fechadas", box: "closed" as const, to: "/inbox?box=closed", icon: "check" as const },
    { label: "Todas", box: "all" as const, to: "/inbox?box=all", icon: "grid" as const },
  ];
  const { data: messages = [] } = useLiveQuery({ query: (q) => selected ? q.from({ messages: messagesCollection }).where(({ messages: item }) => eq(item.conversationId, selected.id)).orderBy(({ messages: item }) => item.createdAt, "asc") : undefined });

  useEffect(() => {
    if (selected && selected.id !== selectedId) setSelectedId(selected.id);
  }, [selected, selectedId]);
  useEffect(() => {
    const linkedConversation = searchParams.get("conversation");
    if (linkedConversation) { setSelectedId(linkedConversation); setMobileView("thread"); }
  }, [searchParams]);
  useEffect(() => {
    const personId = searchParams.get("createFor");
    if (!personId || !canWrite || !canReadContacts) return;
    const person = contacts.find((item) => item.id === personId && !item.deletedAt);
    if (!person) return;
    setNewContact({ value: person.id, label: person.name, ...(person.email ? { description: person.email } : {}) });
    setNewConversationOpen(true);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("createFor");
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams, contacts, canWrite, canReadContacts]);
  useEffect(() => { if (selected && selected.channel !== "email" && selected.channel !== "instagram" && composerMode === "reply") setComposerMode("note"); }, [composerMode, selected]);
  useEffect(() => { const timer = window.setInterval(() => setNow(new Date()), 60_000); return () => window.clearInterval(timer); }, []);
  useEffect(() => {
    const active = activeQueueLink.current;
    const strip = active?.parentElement?.parentElement;
    if (active && strip && strip.scrollWidth > strip.clientWidth) active.scrollIntoView({ block: "nearest", inline: "center" });
  }, [filter, teams.length]);

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

  function closeNewConversation(open: boolean) {
    setNewConversationOpen(open);
    if (open) return;
    setNewContact(null);
    setNewSubject("");
    setNewChannel("manual");
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

  function startConversationAction() {
    if (!canWrite || !canReadContacts) return null;
    return contacts.length > 0
      ? <Button onClick={() => setNewConversationOpen(true)}>Nova conversa</Button>
      : <Button onClick={() => navigate("/")}>Adicionar pessoa</Button>;
  }

  function openConversationOrContact() {
    if (contacts.length > 0) setNewConversationOpen(true);
    else void navigate("/");
  }

  function renderDetails() {
    if (!selected) return null;
    const contact = contacts.find((item) => item.id === selected.contactId);
    const recentConversations = conversations.filter((item) => item.contactId === selected.contactId && item.id !== selected.id).slice(0, 5);
    return <div className={styles.detailTabs}><Tabs label="Informações do atendimento" items={[
      { value: "conversation", label: "Detalhes", content: <>
        <div className={styles.assignment}>
          <div className={styles.assignmentRow}><span>Responsável</span><Select appearance="filter" label="Responsável pela conversa" value={selected.assigneeId} options={[{ value: "", label: "Não atribuído" }, ...users.filter((item) => !item.deactivatedAt).map((item) => ({ value: item.id, label: item.name, avatar: item.avatarUrl }))]} onValueChange={(value) => void updateConversation({ assigneeId: value ? userId.from(value) : null })} disabled={!canWrite || saving} /></div>
          <div className={styles.assignmentRow}><span>Equipe</span><Select appearance="filter" label="Equipe responsável" value={selected.teamId} options={[{ value: "", label: "Sem equipe" }, ...teams.filter((item) => !item.archivedAt).map((item) => ({ value: item.id, label: item.name }))]} onValueChange={(value) => void updateConversation({ teamId: value ? teamId.from(value) : null })} disabled={!canWrite || saving} /></div>
        </div>
        <Accordion defaultValue={["attributes"]} items={[
          { value: "attributes", title: "Atributos da conversa", icon: <Icon name="message" />, content: <dl className={styles.metadata}><div><dt>Situação</dt><dd>{statusLabel(selected.status)}</dd></div><div><dt>Prioridade</dt><dd>{selected.priority === "priority" ? "Prioritária" : "Normal"}</dd></div><div><dt>Canal</dt><dd>{channelLabel(selected.channel)}</dd></div><div><dt>Primeira resposta</dt><dd><SlaBadge conversation={selected} now={now} /></dd></div><div><dt>Criada em</dt><dd>{formatDateTime(selected.createdAt)}</dd></div></dl> },
          { value: "recent", title: "Conversas recentes", icon: <Icon name="message" />, content: recentConversations.length ? <div className={styles.recentConversations}>{recentConversations.map((conversation) => <Button key={conversation.id} variant="ghost" shape="rounded" className={styles.recentConversation} onClick={() => { setDetailsOpen(false); void navigate(`/inbox?box=all&conversation=${conversation.id}`); }}><strong>{conversation.subject}</strong><span>{channelLabel(conversation.channel)} · {statusLabel(conversation.status)}</span></Button>)}</div> : <p className={styles.recentEmpty}>Nenhuma outra conversa desta pessoa.</p> },
        ]} />
      </> },
      { value: "person", label: "Pessoa", content: <div className={styles.contactDetails}><div className={styles.contactCard}><Avatar name={contactNames.get(selected.contactId) ?? "Pessoa"} size="large" /><div><strong>{contactNames.get(selected.contactId) ?? "Pessoa"}</strong><span>{contact?.email ?? "Sem e-mail"}</span></div></div><dl className={styles.metadata}><div><dt>Telefone</dt><dd>{contact?.phone ? formatPhone(contact.phone) : "Não informado"}</dd></div></dl>{canReadContacts && <Button variant="secondary" size="sm" onClick={() => navigate(`/contacts/${selected.contactId}`)}>Abrir perfil</Button>}</div> },
    ]} /></div>;
  }

  return <div className={styles.page}>
    <Sidebar title="Atendimento" className={styles.queueSidebar} actions={canWrite && canReadContacts ? <Button iconOnly size="sm" variant="ghost" aria-label={contacts.length > 0 ? "Nova conversa" : "Adicionar pessoa"} onClick={openConversationOrContact}><Icon name="plus" /></Button> : undefined} footer={firstRun && canReadIntegrations ? <div className={styles.setupCard}><span className={styles.setupCardIcon}><Icon name="bolt" /></span><strong>Prepare seus canais</strong><span>Conecte e-mail ou redes sociais para receber conversas aqui.</span><Button size="sm" variant="secondary" onClick={() => void navigate("/integrations")}>Configurar canais</Button></div> : undefined}>
      <Button variant="ghost" size="sm" shape="rounded" className={styles.queueSearch} icon={<Icon name="search" />} onClick={() => setSearchOpen(true)}>Buscar conversas</Button>
      {queues.map((queue) => <SidebarItem key={queue.box} render={<Link ref={filter === queue.box ? activeQueueLink : undefined} to={queue.to} onClick={() => setMobileView("list")} />} active={filter === queue.box} icon={<Icon name={queue.icon} />} count={queueCount(queue.box)}>{queue.label}</SidebarItem>)}
      {teams.some((team) => !team.archivedAt) && <SidebarSection title="Equipes">
        {teams.filter((team) => !team.archivedAt).map((team) => <SidebarItem key={team.id} render={<Link ref={filter === `team:${team.id}` ? activeQueueLink : undefined} to={`/inbox?box=team:${team.id}`} onClick={() => setMobileView("list")} />} active={filter === `team:${team.id}`} icon={<Icon name="team" />} count={queueCount(`team:${team.id}`)}>{team.name}</SidebarItem>)}
      </SidebarSection>}
      <SidebarSection title="Ferramentas"><SidebarItem render={<Link to="/inbox/replies" />} icon={<Icon name="file" />}>Respostas prontas</SidebarItem></SidebarSection>
    </Sidebar>
    <div className={styles.mobileQueueMenu}>
      <MenuButton variant="ghost" shape="rounded" className={styles.mobileQueueTrigger} icon={<Icon name="inbox" />} aria-label="Selecionar caixa de atendimento" menu={<>
        <MenuGroup label="Caixas">{queues.map((queue) => <MenuItem key={queue.box} icon={<Icon name={queue.icon} />} shortcut={String(queueCount(queue.box))} aria-current={filter === queue.box ? "page" : undefined} onClick={() => { setMobileView("list"); void navigate(queue.to); }}>{queue.label}</MenuItem>)}</MenuGroup>
        {teams.some((team) => !team.archivedAt) && <MenuGroup label="Equipes">{teams.filter((team) => !team.archivedAt).map((team) => <MenuItem key={team.id} icon={<Icon name="team" />} shortcut={String(queueCount(`team:${team.id}`))} aria-current={filter === `team:${team.id}` ? "page" : undefined} onClick={() => { setMobileView("list"); void navigate(`/inbox?box=team:${team.id}`); }}>{team.name}</MenuItem>)}</MenuGroup>}
        <MenuGroup label="Ferramentas"><MenuItem icon={<Icon name="file" />} onClick={() => void navigate("/inbox/replies")}>Respostas prontas</MenuItem></MenuGroup>
      </>}>{filter.startsWith("team:") ? teamNames.get(teamId.from(filter.slice(5))) ?? "Equipe" : filterLabel(filter)}</MenuButton>
    </div>
    <div className={styles.workspace} data-layout={layout} data-preview-open={layout === "table" && selectedId && selected ? "true" : "false"} data-mobile-view={mobileView} data-has-selection={selected ? "true" : "false"} data-first-run={firstRun ? "true" : undefined}>
      <section className={styles.conversationList} aria-label="Lista de conversas">
        <header><strong>{filter.startsWith("team:") ? teamNames.get(teamId.from(filter.slice(5))) ?? "Equipe" : filterLabel(filter)}</strong><span>{filtered.length}</span><div className={styles.listActions}><Button iconOnly size="sm" variant={searchOpen ? "raised" : "ghost"} aria-label={searchOpen ? "Fechar busca" : "Buscar conversas"} aria-expanded={searchOpen} onClick={() => { setSearchOpen((open) => !open); setSearch(""); }}><Icon name="search" /></Button>{canWrite && canReadContacts && <Button iconOnly size="sm" variant="ghost" className={styles.mobileCreate} aria-label={contacts.length > 0 ? "Nova conversa" : "Adicionar pessoa"} onClick={openConversationOrContact}><Icon name="plus" /></Button>}</div></header>
        {searchOpen && <div className={styles.search}><Input aria-label="Buscar conversas" autoFocus startAdornment={<Icon name="search" />} placeholder="Buscar por pessoa, assunto ou canal" value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => { if (event.key === "Escape") { setSearch(""); setSearchOpen(false); } }} /></div>}
        {(!firstRun || layout === "table") && <div className={styles.listControls}><span>{filtered.length} {filtered.length === 1 ? "conversa" : "conversas"}</span><div className={styles.listControlActions}><div className={styles.layoutSwitch} role="group" aria-label="Formato das conversas"><Button iconOnly size="sm" variant={layout === "chat" ? "raised" : "ghost"} aria-label="Visualização de conversa" aria-pressed={layout === "chat"} onClick={() => setLayout("chat")}><Icon name="message" /></Button><Button iconOnly size="sm" variant={layout === "table" ? "raised" : "ghost"} aria-label="Visualização em tabela" aria-pressed={layout === "table"} onClick={() => setLayout("table")}><Icon name="menu" /></Button></div>{layout === "chat" && <MenuButton size="sm" variant="ghost" shape="rounded" menu={<><MenuItem onClick={() => setSortOrder("recent")}>Mais recentes</MenuItem><MenuItem onClick={() => setSortOrder("oldest")}>Mais antigas</MenuItem></>}>{sortOrder === "recent" ? "Mais recentes" : "Mais antigas"}</MenuButton>}</div></div>}
        <div className={styles.listBody}>
          {firstRun && layout === "chat" ? <div className={styles.listFirstRun} role="status"><span className={styles.listFirstRunIcon}><Icon name="message" /></span><strong>Nenhuma conversa ainda</strong><span>As conversas recebidas aparecem nesta lista.</span><div className={styles.listFirstRunAction}>{startConversationAction()}</div></div> : layout === "table" ? <><DataTable label="Conversas" rows={filtered} columns={tableColumns} rowKey={(item) => item.id} rowLabel={(item) => item.subject} state={isLoading && conversations.length === 0 ? "loading" : "ready"} emptyText={searchTerm ? "Nenhuma conversa encontrada." : "Nenhuma conversa nesta caixa."} actions={(item) => <TableIconAction label={`Abrir conversa ${item.subject}`} icon={<Icon name="right" />} onClick={() => { setSelectedId(item.id); setMobileView("thread"); }} />} />{firstRun && <div className={styles.listFirstRunAction}>{startConversationAction()}</div>}</> : <>
          {isLoading && conversations.length === 0 && <p className={styles.empty}>Carregando conversas…</p>}
          {!isLoading && filtered.length === 0 && <p className={styles.empty}>{searchTerm ? "Nenhuma conversa encontrada." : "Nenhuma conversa nesta caixa."}</p>}
          {filtered.map((item) => <Button key={item.id} variant="ghost" shape="rounded" className={styles.conversationButton} data-selected={selected?.id === item.id || undefined} onClick={() => { setSelectedId(item.id); setMobileView("thread"); }}>
            <Avatar name={contactNames.get(item.contactId) ?? "Pessoa"} />
            <span className={styles.preview}><span><strong>{contactNames.get(item.contactId) ?? "Pessoa"}</strong><time>{relativeTime(item.lastMessageAt)}</time></span><b>{item.subject}</b><small>{channelLabel(item.channel)} · {item.teamId ? teamNames.get(item.teamId) ?? "Equipe" : item.assigneeId ? userNames.get(item.assigneeId) ?? "Responsável" : "Não atribuída"}</small><SlaBadge conversation={item} now={now} /></span>
            {item.priority === "priority" && <Icon name="star" />}
          </Button>)}
          </>}
        </div>
      </section>

      <section className={styles.thread} aria-label="Conversa selecionada">
        {selected ? <>
          <header className={styles.threadHeader}>
            <Button type="button" size="sm" variant="ghost" className={styles.mobileBack} onClick={() => setMobileView("list")}>Conversas</Button>
            <div><strong>{selected.subject}</strong><span>{contactNames.get(selected.contactId) ?? "Pessoa"} · {channelLabel(selected.channel)}</span></div>
            <div className={styles.threadActions}>
              <Button iconOnly size="sm" variant="ghost" className={styles.tablePreviewClose} aria-label="Fechar prévia da conversa" onClick={() => { setSelectedId(null); setMobileView("list"); }}><Icon name="close" /></Button>
              <Button iconOnly size="sm" variant="ghost" className={styles.detailsTrigger} aria-label="Abrir detalhes da conversa" onClick={() => setDetailsOpen(true)}><Icon name="user" /></Button>
              <Button iconOnly size="sm" variant={selected.priority === "priority" ? "raised" : "ghost"} aria-label={selected.priority === "priority" ? "Remover prioridade" : "Marcar como prioridade"} disabled={!canWrite || saving} onClick={() => void updateConversation({ priority: selected.priority === "priority" ? "normal" : "priority" })}><Icon name="star" /></Button>
              <Button size="sm" variant="secondary" disabled={!canWrite || saving} onClick={() => void updateConversation({ status: selected.status === "closed" ? "open" : "closed" })}>{selected.status === "closed" ? "Reabrir" : "Fechar"}</Button>
            </div>
          </header>
          <div className={styles.messages}>
            {messages.length === 0 && <div className={styles.threadEmpty}><Icon name="message" /><strong>Conversa iniciada</strong><span>Adicione uma nota interna para registrar o contexto do atendimento.</span></div>}
            {messages.map((message) => <article key={message.id} className={styles.message} data-direction={message.direction}>
              <header><strong>{message.direction === "internal" ? (message.authorUserId ? userNames.get(message.authorUserId) : null) ?? "Equipe" : message.direction === "inbound" ? contactNames.get(message.contactId) ?? "Pessoa" : "Equipe"}</strong><time>{formatDateTime(message.createdAt)}</time></header>
              <p>{message.body}</p>
              <small>{message.direction === "internal" ? "Nota interna" : message.status}</small>
            </article>)}
          </div>
          {canWrite && <form className={styles.composer} data-mode={composerMode} onSubmit={submitMessage}>
            <div className={styles.composerMode}><div className={styles.modeButtons}>{(selected.channel === "email" || selected.channel === "instagram") && <Button type="button" size="sm" variant={composerMode === "reply" ? "raised" : "ghost"} onClick={() => setComposerMode("reply")}>Responder</Button>}<Button type="button" size="sm" variant={composerMode === "note" ? "raised" : "ghost"} onClick={() => setComposerMode("note")}>Nota</Button></div><Badge tone={composerMode === "note" ? "warning" : "success"}>{composerMode === "note" ? "Somente equipe" : channelLabel(selected.channel)}</Badge></div>
            <Textarea className={styles.composerInput} value={note} onChange={(event) => setNote(event.target.value)} placeholder={composerMode === "reply" ? `Responder pelo ${channelLabel(selected.channel)}…` : "Adicione contexto, orientação ou acompanhamento…"} rows={3} />
            {quickRepliesOpen && <div className={styles.replyTools}><SearchSelect label="Inserir resposta pronta" searchPlacement="dropdown" placeholder="Buscar resposta pronta" options={usableReplies.map((reply) => ({ value: reply.id, label: `/${reply.shortcut} · ${reply.title}`, description: reply.body }))} value={null} onValueChange={(option) => { const reply = usableReplies.find((item) => item.id === option?.value); if (reply) { setNote((current) => current ? `${current}\n${reply.body}` : reply.body); setQuickRepliesOpen(false); } }} /><Button type="button" size="sm" variant="ghost" onClick={() => navigate("/inbox/replies")}>Gerenciar</Button></div>}
            <div className={styles.composerFooter}><Button type="button" size="sm" variant="ghost" icon={<Icon name="file" />} aria-expanded={quickRepliesOpen} onClick={() => setQuickRepliesOpen((open) => !open)}>Respostas prontas</Button><span>{note.length}/20.000</span><Button type="submit" loading={saving} disabled={!note.trim()}>{composerMode === "reply" ? "Enviar mensagem" : "Adicionar nota"}</Button></div>
          </form>}
        </> : <div className={styles.threadEmpty}>
          {!isLoading && conversations.length === 0 ? <span className={styles.threadEmptyArt} aria-hidden="true">
            <span className={styles.threadEmptyArtMail}><Icon name="mail" /></span>
            <span className={styles.threadEmptyArtMessage}><Icon name="message" /></span>
            <span className={styles.threadEmptyArtInbox}><Icon name="inbox" /></span>
          </span> : <Icon name="message" />}
          <strong>{isLoading ? "Preparando atendimento" : searchTerm ? "Nenhuma conversa encontrada" : conversations.length === 0 ? "Sua caixa de atendimento está pronta" : "Nenhuma conversa nesta caixa"}</strong>
          <span>{isLoading ? "As conversas aparecem aqui assim que a caixa estiver pronta." : searchTerm ? "Tente buscar por outro nome, assunto ou canal." : conversations.length === 0 ? "Comece uma conversa ou conecte um canal para receber mensagens da sua equipe e das pessoas da sua base." : "Escolha outra caixa para continuar o atendimento."}</span>
          {!isLoading && conversations.length === 0 && <div className={styles.threadEmptyActions}>{startConversationAction()}{canReadIntegrations && <Button variant="secondary" onClick={() => navigate("/integrations")}>Conectar canal</Button>}</div>}
        </div>}
      </section>

      <aside className={styles.details}>
        <div className={styles.detailContent}>{renderDetails()}</div>
      </aside>
    </div>

    <Modal open={detailsOpen && selected !== null} onOpenChange={setDetailsOpen}><ModalContent title="Detalhes da conversa" placement="right"><div className={styles.detailContent}>{renderDetails()}</div></ModalContent></Modal>

    <ActionModal open={newConversationOpen} onOpenChange={closeNewConversation} title="Nova conversa" confirmLabel="Criar conversa" errorText="Selecione uma pessoa e informe o assunto." onConfirm={createConversation}>
      <div className={styles.modalFields}>
        <Field><Label>Pessoa</Label><SearchSelect label="Buscar pessoa" searchPlacement="dropdown" placeholder="Selecionar pessoa" options={contacts.filter((item) => !item.deletedAt).map((item) => ({ value: item.id, label: item.name, ...(item.email ? { description: item.email } : {}) }))} value={newContact} onValueChange={setNewContact} /></Field>
        <Field><Label>Canal de origem</Label><Select label="Canal de origem" value={newChannel} options={CHANNELS} onValueChange={(value) => { if (value) setNewChannel(value as ConversationChannel); }} /></Field>
        <Field><Label>Assunto</Label><Textarea value={newSubject} onChange={(event) => setNewSubject(event.target.value)} placeholder="Descreva o motivo do contato" rows={2} maxLength={300} /></Field>
      </div>
    </ActionModal>
  </div>;
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
function formatDateTime(value: string): string { return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)); }
function relativeTime(value: string): string { const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60_000)); return minutes < 1 ? "agora" : minutes < 60 ? `${minutes} min` : minutes < 1_440 ? `${Math.floor(minutes / 60)} h` : `${Math.floor(minutes / 1_440)} d`; }
function SlaBadge({ conversation, now }: { conversation: Conversation; now: Date }) { const state = conversationSlaState(conversation.firstResponseDueAt, conversation.firstRespondedAt, now); const labels = { met: "Respondida no prazo", on_track: `SLA ${timeUntil(conversation.firstResponseDueAt, now)}`, due_soon: `SLA ${timeUntil(conversation.firstResponseDueAt, now)}`, breached: "SLA vencido" }; return <Badge tone={state === "met" ? "success" : state === "breached" ? "danger" : state === "due_soon" ? "warning" : "neutral"}>{labels[state]}</Badge>; }
function timeUntil(value: string, now: Date): string { const minutes = Math.ceil((new Date(value).getTime() - now.getTime()) / 60_000); if (minutes <= 0) return "vencido"; if (minutes < 60) return `${minutes} min`; return `${Math.ceil(minutes / 60)} h`; }
