import { useConversationSlaSummaries } from "../lib/service-cycles.client";
import { ConversationService } from "../service/ConversationService";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { availableCannedReplies, personThreads, contactId, conversationId, fileId, formatPhone, integrationConnectionId, isWithinWhatsAppSessionWindow, messageId, teamId, userId, type Conversation, type ConversationChannel, type ConversationStatus, type Identity, type IdentityChannel, type Message } from "@spark/core";
import { filesControllerComplete, filesControllerDownload, filesControllerUpload, inboxControllerSend } from "@spark/api-client";
import { optimisticConversation, optimisticInternalNote } from "@spark/data";
import { ActionModal, Button, ChannelChip, ChatAttachment, ChatDay, ChatThread, ChatTyping, ConversationHeader, ConversationList, ConversationListHeader, ConversationRow, EmptyState, Field, Icon, InlineField, Input, Label, MenuButton, MenuGroup, MenuItem, MenuNote, MenuSeparator, MessageBubble, Modal, ModalContent, PersonIdentity, ReplyComposer, ReplyComposerPreview, SearchSelect, Select, Sidebar, SidebarItem, SidebarSearch, SidebarSection, Signal, Surface, Tabs, Textarea, ViewSwitcher, ViewerStack, channelGlyph, notify, type ChatAttachmentState, type ConversationRowProps, type ReplyComposerMode, type SelectOption } from "@spark/ui-web";
import { getSession } from "../lib/auth.client";
import { getContactsCollection } from "../lib/contacts-collection.client";
import { getIdentitiesCollection } from "../lib/identities-collection.client";
import { getConversationsCollection, getMessagesCollection } from "../lib/inbox-collections.client";
import { getIntegrationConnectionsCollection } from "../lib/integration-connections.client";
import { getWhatsAppTemplatesCollection } from "../lib/whatsapp-templates.client";
import { getCannedRepliesCollection } from "../lib/canned-replies-collection.client";
import { getTeamsCollection } from "../lib/teams-collection.client";
import { requireCapability } from "../lib/route-access.client";
import { getUsersCollection } from "../lib/users-collection.client";
import { LinkifiedText } from "../lib/link-previews.client";
import { useConversationPresence } from "../lib/realtime-presence.client";
import styles from "./inbox.module.css";

// Espelha os canais que o ChannelSender do backend sabe enviar (channel-sender.service.ts).
const REPLYABLE_CHANNELS: ReadonlySet<ConversationChannel> = new Set(["email", "instagram", "whatsapp", "messenger", "telegram", "widget"]);
// Canais em que uma org pode ter mais de uma conexão — cada uma vira a própria caixa de entrada (pedido do usuário, 22/09).
const MULTI_CONNECTION_CHANNELS: ReadonlySet<ConversationChannel> = new Set(["whatsapp", "widget", "instagram", "messenger", "telegram", "email"]);
const MESSAGE_LIMIT = 20_000;

const CHANNELS: ReadonlyArray<{ value: ConversationChannel; label: string }> = [
  { value: "manual", label: "Manual" },
  { value: "email", label: "E-mail" },
  { value: "instagram", label: "Instagram" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "messenger", label: "Messenger" },
  { value: "telegram", label: "Telegram" },
  { value: "widget", label: "Chat do site" },
];

type InboxLayout = "chat" | "list";

/** Uma caixa por onde a pessoa fala: a conexão (ou o canal, sem conexão) e a conversa mais recente nela. */
interface PersonInbox { key: string; channel: ConversationChannel; title: string; handle: string | null; conversation: Conversation }

export async function clientLoader() {
  const session = await requireCapability("inbox:read");
  void Promise.allSettled([
    getConversationsCollection().preload(),
    getMessagesCollection().preload(),
    getUsersCollection().preload(),
    getCannedRepliesCollection().preload(),
    getTeamsCollection().preload(),
    getWhatsAppTemplatesCollection().preload(),
    ...(session.capabilities.includes("contacts:read") ? [getContactsCollection().preload(), getIdentitiesCollection().preload()] : []),
    ...(session.capabilities.includes("integrations:read") ? [getIntegrationConnectionsCollection().preload()] : []),
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
  const { data: identities = [] } = useLiveQuery({ query: (q) => canReadContacts ? q.from({ identities: getIdentitiesCollection() }).orderBy(({ identities: item }) => item.createdAt, "asc") : undefined });
  const { data: users } = useLiveQuery({ query: (q) => q.from({ users: getUsersCollection() }).orderBy(({ users: item }) => item.name, "asc") });
  const { data: cannedReplies = [] } = useLiveQuery({ query: (q) => q.from({ replies: getCannedRepliesCollection() }).orderBy(({ replies: item }) => item.shortcut, "asc") });
  const { data: teams = [] } = useLiveQuery({ query: (q) => q.from({ teams: getTeamsCollection() }).orderBy(({ teams: item }) => item.name, "asc") });
  const { data: connections = [] } = useLiveQuery({ query: (q) => canReadIntegrations ? q.from({ connections: getIntegrationConnectionsCollection() }) : undefined });
  const { data: whatsappTemplates = [] } = useLiveQuery({ query: (q) => q.from({ templates: getWhatsAppTemplatesCollection() }).where(({ templates: item }) => eq(item.status, "APPROVED")) });
  const filter = parseInboxFilter(searchParams.get("box"));
  const [layout, setLayout] = useState<InboxLayout>("chat");
  const [mobileView, setMobileView] = useState<"list" | "thread">("list");
  const [now, setNow] = useState(() => new Date());
  const slaSummaries = useConversationSlaSummaries(now);
  const [selectedId, setSelectedId] = useState<string | null>(() => searchParams.get("conversation"));
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState<"recent" | "oldest">("recent");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [newConversationOpen, setNewConversationOpen] = useState(false);
  const [newContact, setNewContact] = useState<SelectOption | null>(null);
  const [newSubject, setNewSubject] = useState("");
  const [newChannel, setNewChannel] = useState<ConversationChannel>("manual");
  const [draft, setDraft] = useState("");
  const [composerMode, setComposerMode] = useState<ReplyComposerMode>("reply");
  const [attachment, setAttachment] = useState<{ id: string; name: string } | null>(null);
  const [uploadingAttachment, setUploadingAttachment] = useState<string | null>(null);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [templateParams, setTemplateParams] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const { seen, markSeen } = useSeenPeople(session?.userId ?? null);

  const contactsById = useMemo(() => new Map(contacts.map((item) => [item.id, item])), [contacts]);
  const userNames = useMemo(() => new Map(users.map((item) => [item.id, item.name])), [users]);
  const teamNames = useMemo(() => new Map(teams.map((item) => [item.id, item.name])), [teams]);
  const connectionNames = useMemo(() => new Map(connections.map((item) => [item.id, item.name])), [connections]);
  const identitiesByPerson = useMemo(() => {
    const byPerson = new Map<string, Identity[]>();
    for (const identity of identities) byPerson.set(identity.contactId, [...(byPerson.get(identity.contactId) ?? []), identity]);
    return byPerson;
  }, [identities]);
  const personName = (id: Conversation["contactId"]) => contactsById.get(id)?.name ?? "Pessoa";
  const inboxTitle = (conversation: Conversation) => (conversation.connectionId ? connectionNames.get(conversation.connectionId) : null) ?? channelLabel(conversation.channel);
  const ownerLabel = (conversation: Conversation) => conversation.assigneeId ? userNames.get(conversation.assigneeId) ?? "Responsável" : conversation.teamId ? teamNames.get(conversation.teamId) ?? "Equipe" : "Não atribuída";
  const currentQueueTitle = filter.startsWith("team:") ? teamNames.get(teamId.from(filter.slice(5))) ?? "Equipe" : filter.startsWith("connection:") ? connectionNames.get(integrationConnectionId.from(filter.slice(11))) ?? "Caixa" : filterLabel(filter);
  const searchTerm = search.trim().toLocaleLowerCase("pt-BR");
  const firstRun = !isLoading && conversations.length === 0 && !searchTerm && (filter === "open" || filter === "all");

  // A conversa é da pessoa: a fila guarda as conversas (rotas por canal) e a lista mostra uma linha por pessoa.
  const inQueue = conversations.filter((item) => matchesFilter(item, filter, session?.userId ?? null)
    && (!searchTerm || [item.subject, contactsById.get(item.contactId)?.name, channelLabel(item.channel), inboxTitle(item), item.teamId ? teamNames.get(item.teamId) : null]
      .some((value) => value?.toLocaleLowerCase("pt-BR").includes(searchTerm))));
  const queueByPerson = new Map<string, Conversation[]>();
  for (const item of inQueue) queueByPerson.set(item.contactId, [...(queueByPerson.get(item.contactId) ?? []), item]);
  const rows = personThreads(inQueue).sort((a, b) => sortOrder === "recent" ? b.lastMessageAt.localeCompare(a.lastMessageAt) : a.lastMessageAt.localeCompare(b.lastMessageAt));

  const requested = selectedId ? conversations.find((item) => item.id === selectedId) ?? null : null;
  const personId = requested && rows.some((item) => item.contactId === requested.contactId) ? requested.contactId : layout === "chat" ? rows[0]?.contactId ?? null : null;
  const personRoutes = personId ? conversations.filter((item) => item.contactId === personId) : [];
  const selected = requested && requested.contactId === personId ? requested : defaultRoute(personRoutes, personId ? queueByPerson.get(personId) : undefined);
  const person = personId ? contactsById.get(personId) : undefined;
  const personIdentities = personId ? identitiesByPerson.get(personId) ?? [] : [];
  const routesById = new Map(personRoutes.map((item) => [item.id, item]));
  const lastInbound = Math.max(0, ...personRoutes.map((item) => instant(item.lastInboundMessageAt)));

  function handleOf(channel: ConversationChannel | IdentityChannel): string | null {
    const identity = personIdentities.find((item) => item.channel === channel);
    if (identity) return identityHandle(identity.channel, identity.externalValue);
    if (channel === "email") return person?.email ?? null;
    if (channel === "phone" && person?.phone) return formatPhone(person.phone);
    return null;
  }
  // Uma caixa por conexão: três Instagrams são três canais, cada um com o nome da caixa e o @ da pessoa.
  const inboxes: PersonInbox[] = [];
  for (const route of personRoutes) {
    const key = route.connectionId ?? `channel:${route.channel}`;
    if (!inboxes.some((item) => item.key === key)) inboxes.push({ key, channel: route.channel, title: inboxTitle(route), handle: handleOf(route.channel), conversation: route });
  }
  const selectedInboxKey = selected ? selected.connectionId ?? `channel:${selected.channel}` : null;
  const replyInboxes = inboxes.filter((item) => REPLYABLE_CHANNELS.has(item.channel));
  // Canais que a pessoa tem e por onde ainda não conversou também aparecem — só o contorno.
  const idleChannels: { key: string; channel: IdentityChannel; title: string; handle: string | null }[] = [];
  for (const identity of personIdentities) {
    if (inboxes.some((item) => item.channel === identity.channel) || idleChannels.some((item) => item.channel === identity.channel)) continue;
    idleChannels.push({ key: identity.id, channel: identity.channel, title: identityChannelLabel(identity.channel), handle: identityHandle(identity.channel, identity.externalValue) });
  }
  if (person?.email && !inboxes.some((item) => item.channel === "email") && !idleChannels.some((item) => item.channel === "email")) idleChannels.push({ key: "contact-email", channel: "email", title: "E-mail", handle: person.email });
  if (person?.phone && !inboxes.some((item) => item.channel === "whatsapp") && !idleChannels.some((item) => item.channel === "whatsapp" || item.channel === "phone")) idleChannels.push({ key: "contact-phone", channel: "phone", title: "Telefone", handle: formatPhone(person.phone) });

  const self = useMemo(() => session ? { id: session.userId, name: userNames.get(userId.from(session.userId)) ?? "Você" } : null, [session, userNames]);
  const { viewers, typingUsers, notifyTyping } = useConversationPresence(selected ? `conversation:${selected.id}` : null, self);
  const usableReplies = availableCannedReplies(cannedReplies, selected?.teamId ?? null);
  const replyable = selected ? REPLYABLE_CHANNELS.has(selected.channel) : false;
  const windowClosed = Boolean(selected) && selected!.channel === "whatsapp" && !isWithinWhatsAppSessionWindow(selected!.lastInboundMessageAt, now);
  const connectionTemplates = whatsappTemplates.filter((item) => item.connectionId === selected?.connectionId);
  const selectedTemplate = connectionTemplates.find((item) => item.id === templateId) ?? null;
  const templatePreview = selectedTemplate ? fillTemplate(selectedTemplate.bodyText, templateParams) : "";
  const useTemplate = composerMode === "reply" && windowClosed;

  const queueCounts = useMemo(() => {
    const people = new Map<InboxFilter, Set<string>>();
    const increment = (box: InboxFilter, contact: string) => { const ids = people.get(box) ?? new Set<string>(); ids.add(contact); people.set(box, ids); };
    for (const conversation of conversations) {
      increment("all", conversation.contactId);
      increment(conversation.status, conversation.contactId);
      if (conversation.status !== "open") continue;
      if (conversation.assigneeId === session?.userId) increment("mine", conversation.contactId);
      if (conversation.assigneeId === null) increment("unassigned", conversation.contactId);
      if (conversation.teamId) increment(`team:${conversation.teamId}`, conversation.contactId);
      increment(`channel:${conversation.channel}`, conversation.contactId);
      if (conversation.connectionId) increment(`connection:${conversation.connectionId}`, conversation.contactId);
    }
    return new Map([...people].map(([box, ids]) => [box, ids.size]));
  }, [conversations, session?.userId]);
  const queueCount = (box: InboxFilter) => queueCounts.get(box) ?? 0;
  // Canal com mais de uma conexão vira uma caixa por conexão (pedido do usuário, 22/09); com zero ou
  // uma, a caixa é o canal. Só canal com conversa aberta — «Manual» não é canal externo.
  const sidebarChannelItems: { key: string; label: string; box: InboxFilter; channel: ConversationChannel }[] = CHANNELS.filter((item) => item.value !== "manual").flatMap((item) => {
    const perConnection = MULTI_CONNECTION_CHANNELS.has(item.value) ? connections.filter((connection) => connection.provider === item.value && connection.status === "connected") : [];
    if (perConnection.length > 1) return perConnection.filter((connection) => queueCounts.has(`connection:${connection.id}`)).map((connection) => ({ key: `connection:${connection.id}`, label: connection.name, box: `connection:${connection.id}` as InboxFilter, channel: item.value }));
    return queueCounts.has(`channel:${item.value}`) ? [{ key: `channel:${item.value}`, label: item.label, box: `channel:${item.value}` as InboxFilter, channel: item.value }] : [];
  });
  const queues = [
    { label: "Abertas", box: "open" as const, to: "/inbox", icon: "inbox" as const },
    { label: "Minhas conversas", box: "mine" as const, to: "/inbox?box=mine", icon: "user" as const },
    { label: "Não atribuídas", box: "unassigned" as const, to: "/inbox?box=unassigned", icon: "users" as const },
    { label: "Adiadas", box: "snoozed" as const, to: "/inbox?box=snoozed", icon: "clock" as const },
    { label: "Fechadas", box: "closed" as const, to: "/inbox?box=closed", icon: "check" as const },
    { label: "Todas", box: "all" as const, to: "/inbox?box=all", icon: "grid" as const },
  ];

  // O histórico junta as mensagens de todas as conversas da pessoa, em ordem.
  const { data: personMessages = [] } = useLiveQuery({ query: (q) => personId ? q.from({ messages: messagesCollection }).where(({ messages: item }) => eq(item.contactId, contactId.from(personId))).orderBy(({ messages: item }) => item.createdAt, "asc") : undefined });
  // Enquanto a consulta da nova pessoa não chega, o resultado anterior não conta como dela.
  const messages = personMessages.filter((item) => item.contactId === personId);
  // A lista larga mostra o começo da última mensagem de cada pessoa (só nela: lê o histórico inteiro).
  const { data: recentMessages = [] } = useLiveQuery({ query: (q) => layout === "list" ? q.from({ messages: messagesCollection }).orderBy(({ messages: item }) => item.createdAt, "desc") : undefined });
  const snippets = useMemo(() => {
    const byPerson = new Map<string, string>();
    for (const message of recentMessages) if (message.direction !== "internal" && !byPerson.has(message.contactId)) byPerson.set(message.contactId, message.body);
    return byPerson;
  }, [recentMessages]);

  // Só a mensagem que chega com a conversa aberta entra com movimento; o histórico já aparece pousado.
  const known = useRef<{ person: string | null; ids: Set<string>; fresh: Set<string> }>({ person: null, ids: new Set(), fresh: new Set() });
  if (known.current.person !== personId || (known.current.ids.size === 0 && messages.length > 0)) known.current = { person: personId, ids: new Set(messages.map((item) => item.id)), fresh: new Set() };
  for (const message of messages) if (!known.current.ids.has(message.id)) { known.current.ids.add(message.id); known.current.fresh.add(message.id); }

  useEffect(() => { if (selected && selected.id !== selectedId) setSelectedId(selected.id); }, [selected, selectedId]);
  useEffect(() => {
    const linkedConversation = searchParams.get("conversation");
    if (linkedConversation) { setSelectedId(linkedConversation); setMobileView("thread"); }
  }, [searchParams]);
  useEffect(() => {
    const createFor = searchParams.get("createFor");
    if (!createFor || !canWrite || !canReadContacts) return;
    const target = contacts.find((item) => item.id === createFor && !item.deletedAt);
    if (!target) return;
    setNewContact({ value: target.id, label: target.name, ...(target.email ? { description: target.email } : {}) });
    setNewConversationOpen(true);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("createFor");
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams, contacts, canWrite, canReadContacts]);
  useEffect(() => { if (selected && !REPLYABLE_CHANNELS.has(selected.channel) && composerMode === "reply") setComposerMode("note"); }, [composerMode, selected]);
  useEffect(() => { setAttachment(null); setTemplateId(null); setTemplateParams([]); }, [selected?.id, composerMode]);
  useEffect(() => { setTemplateParams(selectedTemplate ? Array.from({ length: selectedTemplate.variableCount }, () => "") : []); }, [selectedTemplate?.id]);
  useEffect(() => { const timer = window.setInterval(() => setNow(new Date()), 60_000); return () => window.clearInterval(timer); }, []);
  useEffect(() => { if (personId && lastInbound) markSeen(personId, lastInbound); }, [personId, lastInbound, markSeen]);

  function openPerson(contact: string) {
    const route = defaultRoute(conversations.filter((item) => item.contactId === contact), queueByPerson.get(contact));
    if (!route) return;
    setSelectedId(route.id);
    setMobileView("thread");
  }

  function changeLayout(next: InboxLayout) {
    setLayout(next);
    // A lista larga começa inteira; a conversa abre ao lado quando uma linha é escolhida.
    if (next === "list") setSelectedId(null);
  }

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
      const transaction = conversationsCollection.update(selected.id, (record) => {
        if (changes.status !== undefined) record.status = changes.status;
        if (changes.priority !== undefined) record.priority = changes.priority;
        if (changes.assigneeId !== undefined) record.assigneeId = changes.assigneeId;
        if (changes.teamId !== undefined) record.teamId = changes.teamId;
      });
      await transaction.isPersisted.promise;
    } catch {
      notify({ title: "Não foi possível atualizar a conversa", tone: "error" });
    } finally { setSaving(false); }
  }

  async function attachFile(files: File[]) {
    const file = files[0];
    if (!file) return;
    setUploadingAttachment(file.name);
    try {
      const id = fileId.create();
      const response = await filesControllerUpload({ id, name: file.name, mimeType: file.type || "application/octet-stream", sizeBytes: file.size, folder: null });
      const put = await fetch(response.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type || "application/octet-stream" }, body: file });
      if (!put.ok) throw new Error(`O armazenamento respondeu ${put.status}.`);
      await filesControllerComplete(id);
      setAttachment({ id, name: file.name });
    } catch (error) {
      notify({ title: "Falha no envio do anexo", description: error instanceof Error ? error.message : file.name, tone: "error" });
    } finally { setUploadingAttachment(null); }
  }

  async function submitMessage() {
    const body = draft.trim();
    if (!session || !selected || saving) return;
    if (useTemplate) { if (!selectedTemplate) return; } else if (!body && !attachment) return;
    setSaving(true);
    try {
      if (composerMode === "reply") {
        if (useTemplate && selectedTemplate) await inboxControllerSend(selected.id, { id: messageId.create(), body: templatePreview, template: { name: selectedTemplate.name, language: selectedTemplate.language, parameters: templateParams } });
        else await inboxControllerSend(selected.id, { id: messageId.create(), ...(body ? { body } : {}), ...(attachment ? { attachmentFileId: attachment.id } : {}) });
      } else {
        const message = optimisticInternalNote({ conversationId: conversationId.from(selected.id), contactId: selected.contactId, authorUserId: userId.from(session.userId), body }, session.orgId);
        const transaction = messagesCollection.insert(message);
        await transaction.isPersisted.promise;
      }
      setDraft("");
      setAttachment(null);
      setTemplateId(null);
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

  function authorOf(message: Message): string {
    if (message.direction === "inbound") return personName(message.contactId);
    return (message.authorUserId ? userNames.get(message.authorUserId) : null) ?? "Equipe";
  }

  function rowFor(item: Conversation, index: number) {
    const routes = queueByPerson.get(item.contactId) ?? [item];
    const channels: NonNullable<ConversationRowProps["channels"]>[number][] = [];
    for (const route of routes) {
      const label = inboxTitle(route);
      if (!channels.some((channel) => channel.label === label)) channels.push({ icon: channelGlyph(route.channel), label });
    }
    const inbound = Math.max(0, ...routes.map((route) => instant(route.lastInboundMessageAt)));
    // Aguardando resposta: a última mensagem da conversa é da pessoa.
    const awaiting = routes.some((route) => route.lastInboundMessageAt !== null && instant(route.lastInboundMessageAt) >= instant(route.lastMessageAt));
    return <ConversationRow
      key={item.contactId}
      index={index}
      name={personName(item.contactId)}
      title={item.subject}
      snippet={snippets.get(item.contactId) ?? null}
      time={relativeTime(item.lastMessageAt)}
      dateTime={item.lastMessageAt}
      channels={channels}
      owner={ownerLabel(item)}
      sla={slaSummaries.get(item.id) ?? null}
      unread={awaiting && inbound > (seen[item.contactId] ?? 0) && item.contactId !== personId}
      priority={routes.some((route) => route.priority === "priority")}
      selected={item.contactId === personId}
      onSelect={() => openPerson(item.contactId)}
    />;
  }

  function renderThread() {
    if (!selected || !personId) return null;
    const items: ReactNode[] = [];
    let day = "";
    for (const message of messages) {
      const key = dayKey(message.createdAt);
      if (key !== day) { day = key; items.push(<ChatDay key={`dia-${key}`}>{dayLabel(message.createdAt, now)}</ChatDay>); }
      const route = routesById.get(message.conversationId);
      items.push(<MessageBubble
        key={message.id}
        direction={message.direction}
        author={authorOf(message)}
        time={timeLabel(message.createdAt)}
        dateTime={message.createdAt}
        channel={route ? { icon: channelGlyph(route.channel), label: inboxTitle(route) } : null}
        status={message.status}
        fresh={known.current.fresh.has(message.id)}
        attachment={message.attachmentFileId ? <MessageAttachment fileId={message.attachmentFileId} /> : undefined}
      ><LinkifiedText text={message.body} /></MessageBubble>);
    }
    const priority = selected.priority === "priority";
    const replyRoute = <MenuButton variant="ghost" size="sm" icon={<Icon name={channelGlyph(selected.channel)} />} aria-label={`Responder por ${inboxTitle(selected)}. Trocar`} menu={<MenuGroup label="Responder por">
      {replyInboxes.length ? replyInboxes.map((inbox) => <MenuItem key={inbox.key} icon={<Icon name={channelGlyph(inbox.channel)} />} {...(inbox.handle ? { shortcut: inbox.handle } : {})} aria-current={inbox.key === selectedInboxKey ? "true" : undefined} onClick={() => setSelectedId(inbox.conversation.id)}>{inbox.title}</MenuItem>) : <MenuNote>Esta pessoa ainda não tem um canal que responda.</MenuNote>}
    </MenuGroup>}>{inboxTitle(selected)}</MenuButton>;
    return <>
      <ConversationHeader
        name={personName(personId)}
        subtitle={`${selected.subject} · ${statusLabel(selected.status)}`}
        leading={<Button size="sm" variant="ghost" iconOnly icon={<Icon name="left" />} aria-label="Voltar para as conversas" className={styles.mobileOnly} onClick={() => setMobileView("list")} />}
        channels={inboxes.length + idleChannels.length > 0 ? <>
          {inboxes.map((inbox) => <ChannelChip key={inbox.key} channel={inbox.channel} title={inbox.title} handle={inbox.handle} selected={inbox.key === selectedInboxKey} onSelect={() => setSelectedId(inbox.conversation.id)} />)}
          {idleChannels.map((item) => <ChannelChip key={item.key} channel={item.channel} title={item.title} handle={item.handle} idle />)}
        </> : undefined}
        presence={viewers.length > 0 ? <ViewerStack label="Pessoas vendo esta conversa" viewers={viewers.map((viewer) => ({ userId: userId.from(viewer.id), name: viewer.name, avatarUrl: null }))} status="connected" /> : undefined}
        actions={<>
          <Button size="sm" variant="ghost" iconOnly icon={<Icon name="panel" />} aria-label="Abrir detalhes da conversa" className={styles.detailsTrigger} onClick={() => setDetailsOpen(true)} />
          <Button size="sm" variant={priority ? "raised" : "ghost"} iconOnly icon={<Icon name="star" />} aria-label={priority ? "Remover prioridade" : "Marcar como prioridade"} aria-pressed={priority} disabled={!canWrite || saving} onClick={() => void updateConversation({ priority: priority ? "normal" : "priority" })} />
          <Button size="sm" variant="secondary" icon={<Icon name={selected.status === "closed" ? "undo" : "check"} />} disabled={!canWrite || saving} onClick={() => void updateConversation({ status: selected.status === "closed" ? "open" : "closed" })}>{selected.status === "closed" ? "Reabrir" : "Fechar"}</Button>
          {layout === "list" && <Button size="sm" variant="ghost" iconOnly icon={<Icon name="close" />} aria-label="Fechar a conversa e voltar para a lista" onClick={() => { setSelectedId(null); setMobileView("list"); }} />}
        </>}
      />
      <ChatThread label={`Conversa com ${personName(personId)}`} threadKey={personId} empty="Conversa iniciada. Registre o contexto do atendimento numa nota para a equipe.">
        {items}
      </ChatThread>
      {typingUsers.length > 0 && <ChatTyping>{typingUsers.length === 1 ? `${typingUsers[0]!.name} está digitando…` : `${typingUsers.map((item) => item.name).join(", ")} estão digitando…`}</ChatTyping>}
      {canWrite && <div className={styles.composer}>
        <ReplyComposer
          mode={composerMode}
          onModeChange={setComposerMode}
          replyDisabled={!replyable}
          value={draft}
          onValueChange={(value) => { setDraft(value); notifyTyping(); }}
          onSubmit={() => void submitMessage()}
          placeholder={composerMode === "reply" ? `Responder pelo ${inboxTitle(selected)}…` : "Adicione contexto, orientação ou acompanhamento para a equipe…"}
          maxLength={MESSAGE_LIMIT}
          submitting={saving}
          canSubmit={useTemplate ? Boolean(selectedTemplate) : Boolean(draft.trim()) || Boolean(attachment)}
          route={replyRoute}
          notice={useTemplate ? <Signal tone="warning">Fora da janela de 24 h do WhatsApp: só modelo aprovado passa.</Signal> : undefined}
          body={useTemplate ? <div className={styles.template}>
            <Select label="Modelo aprovado" placeholder={connectionTemplates.length ? "Escolher modelo" : "Nenhum modelo sincronizado — configure em Integrações"} value={templateId} options={connectionTemplates.map((item) => ({ value: item.id, label: `${item.name} (${item.language})` }))} onValueChange={setTemplateId} />
            {selectedTemplate && Array.from({ length: selectedTemplate.variableCount }, (_, index) => <Input key={index} aria-label={`Variável {{${index + 1}}}`} placeholder={`{{${index + 1}}}`} value={templateParams[index] ?? ""} onChange={(event) => setTemplateParams((current) => current.map((value, position) => position === index ? event.target.value : value))} />)}
            {selectedTemplate && <ReplyComposerPreview>{templatePreview}</ReplyComposerPreview>}
          </div> : undefined}
          tools={useTemplate ? undefined : <MenuButton variant="ghost" size="sm" iconOnly indicator={false} icon={<Icon name="text" />} aria-label="Inserir resposta pronta" menu={<>
            <MenuGroup label="Respostas prontas">
              {usableReplies.length ? usableReplies.map((reply) => <MenuItem key={reply.id} shortcut={`/${reply.shortcut}`} onClick={() => setDraft((current) => current ? `${current}\n${reply.body}` : reply.body)}>{reply.title}</MenuItem>) : <MenuNote>Nenhuma resposta pronta para esta equipe.</MenuNote>}
            </MenuGroup>
            <MenuSeparator />
            <MenuItem icon={<Icon name="settings" />} onClick={() => void navigate("/inbox/replies")}>Gerenciar respostas</MenuItem>
          </>} />}
          {...(composerMode === "reply" && !useTemplate ? { onAttach: (files: File[]) => void attachFile(files) } : {})}
          attachment={uploadingAttachment ? { name: uploadingAttachment, uploading: true } : attachment}
          onRemoveAttachment={() => setAttachment(null)}
        />
      </div>}
    </>;
  }

  function renderDetails() {
    if (!selected || !personId) return null;
    return <Tabs label="Informações do atendimento" items={[
      { value: "conversation", label: "Atendimento", content: <div className={styles.fields}>
        <InlineField block label="Responsável" value={selected.assigneeId ? userNames.get(selected.assigneeId) ?? "Responsável" : "Não atribuído"} empty={!selected.assigneeId} disabled={!canWrite || saving}>
          {(close) => <Select wrapValue label="Responsável pela conversa" value={selected.assigneeId ?? ""} options={[{ value: "", label: "Não atribuído" }, ...users.filter((item) => !item.deactivatedAt).map((item) => ({ value: item.id, label: item.name }))]} onValueChange={(value) => close(updateConversation({ assigneeId: value ? userId.from(value) : null }))} />}
        </InlineField>
        <InlineField block label="Equipe" value={selected.teamId ? teamNames.get(selected.teamId) ?? "Equipe" : "Sem equipe"} empty={!selected.teamId} disabled={!canWrite || saving}>
          {(close) => <Select wrapValue label="Equipe responsável" value={selected.teamId ?? ""} options={[{ value: "", label: "Sem equipe" }, ...teams.filter((item) => !item.archivedAt).map((item) => ({ value: item.id, label: item.name }))]} onValueChange={(value) => close(updateConversation({ teamId: value ? teamId.from(value) : null }))} />}
        </InlineField>
        <InlineField label="Caixa" value={inboxTitle(selected)} leading={<Icon name={channelGlyph(selected.channel)} />} />
        <ConversationService key={selected.id} conversation={selected} now={now} canWrite={canWrite} />
        <InlineField label="Aberta em" value={formatDateTime(selected.createdAt)} />
      </div> },
      { value: "person", label: "Pessoa", content: <div className={styles.fields}>
        <PersonIdentity name={personName(personId)} detail={person?.email ?? (person?.phone ? formatPhone(person.phone) : "Sem e-mail")} />
        <InlineField label="E-mail" value={person?.email ?? "Não informado"} empty={!person?.email} />
        <InlineField label="Telefone" value={person?.phone ? formatPhone(person.phone) : "Não informado"} empty={!person?.phone} />
        <InlineField label="Conversas" value={`${personRoutes.length} ${personRoutes.length === 1 ? "caixa" : "caixas"} · ${personRoutes.filter((item) => item.status === "open").length} abertas`} />
        {canReadContacts && <Button variant="secondary" size="sm" icon={<Icon name="user" />} onClick={() => navigate(`/contacts/${personId}`)}>Abrir perfil</Button>}
      </div> },
    ]} />;
  }

  const open = Boolean(selected && personId);
  const listLabel = `${currentQueueTitle}: conversas`;
  return <div className={styles.page}>
    <Sidebar title="Atendimento" className={styles.queueSidebar} actions={canWrite && canReadContacts ? <Button iconOnly size="sm" variant="ghost" icon={<Icon name="plus" />} aria-label={contacts.length > 0 ? "Nova conversa" : "Adicionar pessoa"} onClick={openConversationOrContact} /> : undefined}>
      <SidebarSearch label="Buscar conversas" placeholder="Buscar conversas" value={search} onValueChange={setSearch} shortcut="/" />
      {queues.map((queue) => <SidebarItem key={queue.box} render={<Link to={queue.to} onClick={() => setMobileView("list")} />} active={filter === queue.box} icon={<Icon name={queue.icon} />} count={queueCount(queue.box)}>{queue.label}</SidebarItem>)}
      {teams.some((team) => !team.archivedAt) && <SidebarSection title="Equipes">
        {teams.filter((team) => !team.archivedAt).map((team) => <SidebarItem key={team.id} render={<Link to={`/inbox?box=team:${team.id}`} onClick={() => setMobileView("list")} />} active={filter === `team:${team.id}`} icon={<Icon name="users" />} count={queueCount(`team:${team.id}`)}>{team.name}</SidebarItem>)}
      </SidebarSection>}
      {sidebarChannelItems.length > 0 && <SidebarSection title="Canais">
        {sidebarChannelItems.map((item) => <SidebarItem key={item.key} render={<Link to={`/inbox?box=${item.box}`} onClick={() => setMobileView("list")} />} active={filter === item.box} icon={<Icon name={channelGlyph(item.channel)} />} count={queueCount(item.box)}>{item.label}</SidebarItem>)}
      </SidebarSection>}
      <SidebarSection title="Ferramentas"><SidebarItem render={<Link to="/inbox/replies" />} icon={<Icon name="text" />}>Respostas prontas</SidebarItem></SidebarSection>
    </Sidebar>

    <Surface radius="lista" className={styles.mobileBar}>
      <MenuButton variant="ghost" icon={<Icon name="inbox" />} aria-label={`Caixa de atendimento: ${currentQueueTitle}. Trocar`} menu={<>
        <MenuGroup label="Caixas">{queues.map((queue) => <MenuItem key={queue.box} icon={<Icon name={queue.icon} />} shortcut={String(queueCount(queue.box))} aria-current={filter === queue.box ? "page" : undefined} onClick={() => { setMobileView("list"); void navigate(queue.to); }}>{queue.label}</MenuItem>)}</MenuGroup>
        {teams.some((team) => !team.archivedAt) && <MenuGroup label="Equipes">{teams.filter((team) => !team.archivedAt).map((team) => <MenuItem key={team.id} icon={<Icon name="users" />} shortcut={String(queueCount(`team:${team.id}`))} aria-current={filter === `team:${team.id}` ? "page" : undefined} onClick={() => { setMobileView("list"); void navigate(`/inbox?box=team:${team.id}`); }}>{team.name}</MenuItem>)}</MenuGroup>}
        {sidebarChannelItems.length > 0 && <MenuGroup label="Canais">{sidebarChannelItems.map((item) => <MenuItem key={item.key} icon={<Icon name={channelGlyph(item.channel)} />} shortcut={String(queueCount(item.box))} aria-current={filter === item.box ? "page" : undefined} onClick={() => { setMobileView("list"); void navigate(`/inbox?box=${item.box}`); }}>{item.label}</MenuItem>)}</MenuGroup>}
        <MenuGroup label="Ferramentas"><MenuItem icon={<Icon name="text" />} onClick={() => void navigate("/inbox/replies")}>Respostas prontas</MenuItem></MenuGroup>
      </>}>{currentQueueTitle}</MenuButton>
      {canWrite && canReadContacts && <Button iconOnly size="sm" variant="ghost" icon={<Icon name="plus" />} aria-label={contacts.length > 0 ? "Nova conversa" : "Adicionar pessoa"} onClick={openConversationOrContact} />}
    </Surface>

    <div className={styles.workspace} data-layout={layout} data-open={open ? "true" : "false"} data-mobile-view={mobileView} data-first-run={firstRun ? "true" : undefined}>
      <Surface as="section" className={styles.list} aria-label="Lista de conversas">
        <ConversationListHeader title={currentQueueTitle} count={rows.length} actions={<>
          <Select appearance="filter" label="Ordenar conversas" value={sortOrder} options={[{ value: "recent", label: "Recentes" }, { value: "oldest", label: "Antigas" }]} onValueChange={(value) => { if (value === "recent" || value === "oldest") setSortOrder(value); }} />
          <ViewSwitcher label="Formato da lista de conversas" value={layout} onValueChange={changeLayout} views={[{ value: "chat", label: "Conversa", icon: "message" }, { value: "list", label: "Lista", icon: "list" }]} />
        </>} />
        <div className={styles.mobileSearch}><SidebarSearch label="Buscar conversas" placeholder="Buscar conversas" value={search} onValueChange={setSearch} /></div>
        <ConversationList label={listLabel} layout={layout === "list" ? "wide" : "compact"} empty={isLoading && conversations.length === 0 ? "Carregando conversas…" : searchTerm ? "Nenhuma conversa encontrada. Tente outro nome, assunto ou caixa." : "Nenhuma conversa nesta caixa."}>
          {rows.map(rowFor)}
        </ConversationList>
      </Surface>

      {open ? <Surface as="section" className={styles.thread} aria-label={`Conversa com ${personName(personId!)}`}>{renderThread()}</Surface>
        : layout === "chat" && <div className={styles.threadEmpty}>
          {firstRun || (!isLoading && conversations.length === 0)
            ? <EmptyState variant="featured" icon="message" title="Sua caixa de atendimento está pronta" description="Comece uma conversa ou conecte um canal para receber as mensagens das pessoas da sua base." action={startConversationAction()} secondaryAction={canReadIntegrations ? <Button variant="secondary" onClick={() => navigate("/integrations")}>Conectar canal</Button> : undefined} />
            : <EmptyState icon="message" title={isLoading ? "Preparando o atendimento" : searchTerm ? "Nenhuma conversa encontrada" : "Nenhuma conversa nesta caixa"} description={isLoading ? "As conversas aparecem aqui assim que a caixa estiver pronta." : searchTerm ? "Tente buscar por outro nome, assunto ou caixa." : "Escolha outra caixa para continuar o atendimento."} />}
        </div>}

      {open && layout === "chat" && <Surface as="aside" className={styles.details} aria-label="Detalhes do atendimento">{renderDetails()}</Surface>}
    </div>

    <Modal open={detailsOpen && open} onOpenChange={setDetailsOpen}><ModalContent title="Detalhes do atendimento" placement="right">{renderDetails()}</ModalContent></Modal>

    <ActionModal open={newConversationOpen} onOpenChange={closeNewConversation} title="Nova conversa" confirmLabel="Criar conversa" errorText="Selecione uma pessoa e informe o assunto." onConfirm={createConversation}>
      <div className={styles.fields}>
        <Field><Label>Pessoa</Label><SearchSelect label="Buscar pessoa" searchPlacement="dropdown" placeholder="Selecionar pessoa" options={contacts.filter((item) => !item.deletedAt).map((item) => ({ value: item.id, label: item.name, ...(item.email ? { description: item.email } : {}) }))} value={newContact} onValueChange={setNewContact} /></Field>
        <Field><Label>Canal de origem</Label><Select label="Canal de origem" value={newChannel} options={CHANNELS} onValueChange={(value) => { if (value) setNewChannel(value as ConversationChannel); }} /></Field>
        <Field><Label>Assunto</Label><Textarea value={newSubject} onChange={(event) => setNewSubject(event.target.value)} placeholder="Descreva o motivo do contato" rows={2} maxLength={300} /></Field>
      </div>
    </ActionModal>
  </div>;
}

/** Pessoas já vistas por quem atende: guarda a última mensagem recebida que a pessoa viu, só neste navegador. */
function useSeenPeople(viewer: string | null) {
  const storageKey = viewer ? `spark:atendimento:vistas:${viewer}` : null;
  const [seen, setSeen] = useState<Record<string, number>>({});
  useEffect(() => {
    if (!storageKey) return;
    try { setSeen(JSON.parse(localStorage.getItem(storageKey) ?? "{}") as Record<string, number>); } catch { setSeen({}); }
  }, [storageKey]);
  const markSeen = useCallback((person: string, at: number) => {
    setSeen((current) => {
      if ((current[person] ?? 0) >= at) return current;
      const next = { ...current, [person]: at };
      try { if (storageKey) localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* sem armazenamento: a marca vale até recarregar */ }
      return next;
    });
  }, [storageKey]);
  return { seen, markSeen };
}

/** Por onde responder ao abrir a pessoa: a caixa da última mensagem dela, entre as conversas da fila. */
function defaultRoute(routes: readonly Conversation[], preferred: readonly Conversation[] = []): Conversation | null {
  const pool = preferred.length ? preferred : routes;
  const replyable = pool.filter((item) => REPLYABLE_CHANNELS.has(item.channel));
  const candidates = replyable.length ? replyable : pool;
  return [...candidates].sort((a, b) => instant(b.lastInboundMessageAt) - instant(a.lastInboundMessageAt) || instant(b.lastMessageAt) - instant(a.lastMessageAt))[0] ?? null;
}

/** Instante em milissegundos: o sync entrega o texto do Postgres («2026-10-02 12:00:00+00»), a API entrega ISO. */
function instant(value: string | null): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  if (!Number.isNaN(parsed)) return parsed;
  return Date.parse(value.replace(" ", "T").replace(/([+-]\d\d)$/, "$1:00")) || 0;
}

type InboxFilter = ConversationStatus | "all" | "mine" | "unassigned" | `team:${string}` | `channel:${string}` | `connection:${string}`;
function parseInboxFilter(value: string | null): InboxFilter {
  if (value === "all" || value === "mine" || value === "unassigned" || value === "closed" || value === "snoozed") return value;
  if (value?.startsWith("team:")) return value as `team:${string}`;
  if (value?.startsWith("channel:")) return value as `channel:${string}`;
  if (value?.startsWith("connection:")) return value as `connection:${string}`;
  return "open";
}
function matchesFilter(item: Conversation, filter: InboxFilter, currentUserId: string | null): boolean {
  if (filter === "all") return true;
  if (filter === "mine") return item.status === "open" && item.assigneeId === currentUserId;
  if (filter === "unassigned") return item.status === "open" && item.assigneeId === null;
  if (filter.startsWith("team:")) return item.status === "open" && item.teamId === filter.slice(5);
  if (filter.startsWith("channel:")) return item.status === "open" && item.channel === filter.slice(8);
  if (filter.startsWith("connection:")) return item.status === "open" && item.connectionId === filter.slice(11);
  return item.status === filter;
}
function filterLabel(value: InboxFilter): string { if (value.startsWith("team:")) return "Fila da equipe"; if (value.startsWith("channel:")) return channelLabel(value.slice(8) as ConversationChannel); if (value.startsWith("connection:")) return "Caixa"; if (value === "open") return "Abertas"; if (value === "mine") return "Minhas conversas"; if (value === "unassigned") return "Não atribuídas"; if (value === "snoozed") return "Adiadas"; if (value === "closed") return "Fechadas"; return "Todas"; }
function channelLabel(value: ConversationChannel): string { return CHANNELS.find((item) => item.value === value)?.label ?? value; }
function identityChannelLabel(value: IdentityChannel): string { return value === "phone" ? "Telefone" : channelLabel(value); }
/** Endereço legível da pessoa no canal; ID interno da Meta (número puro) não vira @. */
function identityHandle(channel: IdentityChannel, value: string): string | null {
  if (channel === "email") return value;
  if (channel === "whatsapp" || channel === "phone") return formatPhone(value as Parameters<typeof formatPhone>[0]);
  if ((channel === "instagram" || channel === "telegram") && !/^\d+$/.test(value)) return `@${value}`;
  return null;
}
function statusLabel(value: ConversationStatus): string { return ({ open: "Aberta", snoozed: "Adiada", closed: "Fechada" })[value]; }
function formatDateTime(value: string): string { return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)); }
function timeLabel(value: string): string { return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(value)); }
function dayKey(value: string): string { const date = new Date(value); return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`; }
function dayLabel(value: string, now: Date): string {
  const date = new Date(value);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((today.getTime() - new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()) / 86_400_000);
  if (days === 0) return "Hoje";
  if (days === 1) return "Ontem";
  return new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short", ...(date.getFullYear() === now.getFullYear() ? {} : { year: "numeric" }) }).format(date);
}
function relativeTime(value: string): string { const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60_000)); return minutes < 1 ? "agora" : minutes < 60 ? `${minutes} min` : minutes < 1_440 ? `${Math.floor(minutes / 60)} h` : `${Math.floor(minutes / 1_440)} d`; }
function fillTemplate(bodyText: string, values: string[]): string { return bodyText.replace(/\{\{\s*(\d+)\s*\}\}/g, (_, index: string) => values[Number(index) - 1]?.trim() || `{{${index}}}`); }

/** Busca a URL assinada uma vez, ao montar; a bolha decide entre tocar ali mesmo ou oferecer o arquivo. */
function MessageAttachment({ fileId: id }: { fileId: string }) {
  const [state, setState] = useState<ChatAttachmentState>({ status: "loading" });
  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    filesControllerDownload(id)
      .then((response) => { if (!cancelled) setState({ status: "ready", url: response.downloadUrl, mimeType: response.mimeType, name: response.name }); })
      .catch(() => { if (!cancelled) setState({ status: "error" }); });
    return () => { cancelled = true; };
  }, [id]);
  return <ChatAttachment state={state} />;
}
