import { contactsControllerLinkCompany } from "@spark/api-client";
import { getContactCompaniesCollection } from "../lib/contact-companies.client";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { eq, useLiveQuery } from "@tanstack/react-db";
import {
  canMoveBetweenStages,
  dealFieldValue,
  canCloseAtStage,
  contactId as contactIdFactory,
  companyId as companyIdFactory,
  dealId as dealIdFactory,
  formatBRL,
  InvalidMoneyError,
  toCents,
  stageId as stageIdFactory,
  userId as userIdFactory,
  type Activity,
  type ActivityAvailability,
  type ActivityPriority,
  type ActivityType,
  type DealStatus,
  type Money,
  ACTIVITY_TYPES,
  ACTIVITY_TYPE_LABELS,
  activityEndsAt,
  overlappingScheduleIntervals,
  dealProductTotals,
  dealProductsSummary,
  formatQuantity,
  parseQuantity,
  formatBasisPoints,
  productId as productIdFactory,
  type DealProduct,
  millisecondsByStage,
  millisecondsOfLatestVisitByStage,
  stageVisits,
  formatStageDuration,
  formatDetailedStageDuration,
  evaluateStageFields,
  stageFieldLabel,
  stageFieldMessage,
  stageFieldGaps,
  type Note,
  type Deal,
  type CalendarEvent,
  type User,
} from "@spark/core";
import { optimisticActivity, syncedAmount, optimisticDealProduct, itemForInsert, optimisticNote, optimisticDealFollower, writeAccepted } from "@spark/data";
import { Accordion, AmountSummary, Alert, Checkbox, AvatarStack, Chip, RecordWorkspace, RecordSection, DealStageActions, ActionModal, Panel, PanelContent, PercentInput, Avatar, UserAvatar, userSelectOption, ViewerStack, RecordSelect, BackLink, Button, DatePicker, TimePicker, EmptyState, Field, Icon, IconTile, InlineEdit, InlineField, Input, RecordValue, Label, LinkRecordsPreview, ListRow, MenuButton, MenuGroup, MenuItem, MenuNote, MoneyInput, NoteCard, OwnerPicker, PageFrame, PageHeader, RowList, SearchSelect, SectionTitle, SegmentedControl, Select, Signal, Skeleton, StagePassageHistory, StageProgress, Surface, Tabs, Text, Textarea, Timeline, notify, celebrateDealOutcome, type IconName, type SelectOption } from "@spark/ui-web";
import type { Route } from "./+types/deal-detail";
import { getActivitiesCollection } from "../lib/activities-collection.client";
import { getCustomFieldsCollection } from "../lib/custom-fields-collection.client";
import { getCustomFieldOptionsCollection, getCustomFieldValuesCollection } from "../lib/custom-field-data.client";
import { useCustomFieldOptions, useCustomFieldValues } from "../lib/custom-fields.client";
import { getDealProductsCollection } from "../lib/deal-products-collection.client";
import { getDealFollowersCollection } from "../lib/deal-followers-collection.client";
import { getStageFieldRulesCollection } from "../lib/stage-field-rules-collection.client";
import { getNotesCollection } from "../lib/notes-collection.client";
import { getProductsCollection } from "../lib/catalog-collections.client";
import { getContactsCollection } from "../lib/contacts-collection.client";
import { getDetailDealsCollection, getPipelinesCollection, getStagesCollection } from "../lib/deals-collections.client";
import { getUsersCollection } from "../lib/users-collection.client";
import { getCalendarEventsCollection } from "../lib/calendar-events-collection.client";
import { getSession } from "../lib/auth.client";
import { getCompaniesCollection } from "../lib/companies-collection.client";
import { getDealEventsCollection } from "../lib/events-collection.client";
import { getConversationsCollection } from "../lib/inbox-collections.client";
import { groupTimelineEvents } from "../lib/event-presentation";
import { requireCapability } from "../lib/route-access.client";
import { EnrichedCustomFieldValue } from "../lib/company-registrations.client";
import { useDealPresence } from "../lib/deal-presence.client";
import { RelatedRecords } from "../crm/RelatedRecords";
import { DealTags } from "../crm/DealTags";
import { useDealTags } from "../lib/tags.client";
import { getStageTransitionsCollection } from "../lib/deals-collections.client";
import styles from "./deal-detail.module.css";

const ACTIVITY_TYPE_OPTIONS = ACTIVITY_TYPES.map((value) => ({ value, label: ACTIVITY_TYPE_LABELS[value] }));
const ACTIVITY_COMPOSER_TABS: readonly { id: ActivityType | "note"; label: string; icon: IconName }[] = [
  { id: "note", label: "Nota", icon: "file" },
  { id: "call", label: "Ligação", icon: "phone" },
  { id: "meeting", label: "Reunião", icon: "team" },
  { id: "task", label: "Tarefa", icon: "check" },
  { id: "deadline", label: "Prazo", icon: "pushpin" },
  { id: "email", label: "E-mail", icon: "mail" },
  { id: "lunch", label: "Almoço", icon: "calendar" },
];
/** O disco de cada tipo de atividade: o mesmo ícone do compositor. */
const ACTIVITY_ICONS = Object.fromEntries(ACTIVITY_COMPOSER_TABS.flatMap((tab) => tab.id === "note" ? [] : [[tab.id, tab.icon]])) as Record<ActivityType, IconName>;
const PRIORITIES = [{ value: "none", label: "Sem prioridade" }, { value: "high", label: "Alta" }, { value: "medium", label: "Média" }, { value: "low", label: "Baixa" }];
const AVAILABILITIES = [{ value: "free", label: "Livre — permite sobreposição" }, { value: "busy", label: "Ocupado — reserva o horário" }];

const ACTIVITY_FORM_HINTS: Record<ActivityType, string> = {
  call: "Reserve o horário da ligação e use a pessoa vinculada como contato.",
  meeting: "Defina duração, local ou videochamada e o que vai no convite.",
  task: "Registre uma entrega objetiva com data e prioridade.",
  deadline: "Marque um prazo sem reservar um bloco na agenda.",
  email: "Programe o acompanhamento por e-mail para a pessoa vinculada.",
  lunch: "Reserve o período e informe o local do encontro.",
};

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const session = await requireCapability("deals:read");
  void Promise.allSettled([
    getDetailDealsCollection(dealIdFactory.from(params.dealId)).preload(),
    getPipelinesCollection().preload(),
    getStagesCollection().preload(),
    getUsersCollection().preload(),
    getDealProductsCollection().preload(),
    getDealFollowersCollection(dealIdFactory.from(params.dealId)).preload(),
    getStageFieldRulesCollection().preload(),
    getCustomFieldValuesCollection().preload(),
    getCustomFieldOptionsCollection().preload(),
    getNotesCollection().preload(),
    getDealEventsCollection(dealIdFactory.from(params.dealId)).preload(),
    ...(session.capabilities.includes("contacts:read") ? [getContactsCollection().preload()] : []),
    ...(session.capabilities.includes("activities:read") ? [getActivitiesCollection().preload()] : []),
    ...(session.capabilities.includes("activities:read") ? [getCalendarEventsCollection().preload()] : []),
    ...(session.capabilities.includes("companies:read") ? [getCompaniesCollection().preload()] : []),
  ]);
  return null;
}

function activityOwnerOption(users: User[], ownerId: string) {
  const owner = users.find((user) => user.id === ownerId);
  return owner ? userSelectOption(owner) : null;
}

function formatExternalTimeRange(startsAt: string, endsAt: string, allDay: boolean): string {
  if (allDay) return "Dia todo";
  const formatter = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `${formatter.format(new Date(startsAt))}–${formatter.format(new Date(endsAt))}`;
}

export default function DealDetail({ params }: Route.ComponentProps) { return <DealWorkspace dealId={params.dealId} />; }
export function DealWorkspace({ dealId, embedded = false }: { dealId: string; embedded?: boolean }) {
  const params = { dealId };
  const location = useLocation();
  const navigate = useNavigate();
  const returnTo = encodeURIComponent(`${location.pathname}${location.search}`);
  const tagsByDeal = useDealTags();
  const { data: transitions = [] } = useLiveQuery({ query: (q) => q.from({ transitions: getStageTransitionsCollection() }) });
  const dealsCollection = getDetailDealsCollection(dealIdFactory.from(params.dealId));
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [itemModalClosing, setItemModalClosing] = useState(false);
  const [quickPanel, setQuickPanel] = useState<"stage" | "commercial">("stage");
  const [embeddedItemEditorOpen, setEmbeddedItemEditorOpen] = useState(false);
  const [pageTab, setPageTab] = useState("atividade");
  const [openSections, setOpenSections] = useState<string[]>(["resumo", "detalhes"]);
  const stagesCollection = getStagesCollection();
  const pipelinesCollection = getPipelinesCollection();
  const contactsCollection = getContactsCollection();
  const usersCollection = getUsersCollection();
  const activitiesCollection = getActivitiesCollection();
  const itemsCollection = getDealProductsCollection();
  const followersCollection = getDealFollowersCollection(dealIdFactory.from(params.dealId));
  const notesCollection = getNotesCollection();
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
  }, [dealsCollection, params.dealId]);
  const presence = useDealPresence(deal?.id);
  const { data: stages } = useLiveQuery({ query: (q) => q.from({ stages: stagesCollection }).orderBy(({ stages: item }) => item.sortOrder, "asc") });
  const { data: pipelines } = useLiveQuery({ query: (q) => q.from({ pipelines: pipelinesCollection }) });
  const { data: contacts = [], isLoading: contactsLoading } = useLiveQuery({ query: (q) => canReadContacts ? q.from({ contacts: contactsCollection }).orderBy(({ contacts: item }) => item.name, "asc") : undefined });
  const { data: users } = useLiveQuery({ query: (q) => q.from({ users: usersCollection }).orderBy(({ users: item }) => item.name, "asc") });
  const { data: followers = [] } = useLiveQuery({ query: (q) => q.from({ followers: followersCollection }).orderBy(({ followers: item }) => item.createdAt, "asc") });
  const { data: companies = [], isLoading: companiesLoading } = useLiveQuery({ query: (q) => canReadCompanies ? q.from({ companies: companiesCollection }).orderBy(({ companies: item }) => item.name, "asc") : undefined });
  const { data: activities = [] } = useLiveQuery({
    query: (q) => canReadActivities ? q.from({ activities: activitiesCollection }).where(({ activities: item }) => eq(item.dealId, params.dealId)).orderBy(({ activities: item }) => item.scheduledAt, "asc") : undefined,
  });
  /* A ficha mostra só as atividades deste negócio, mas disponibilidade é da
   * pessoa inteira: um compromisso de outro negócio também ocupa a agenda.
   * A consulta continua local-first; abrir a modal não faz request. */
  const { data: calendarActivities = [] } = useLiveQuery({
    query: (q) => canReadActivities ? q.from({ activities: activitiesCollection }).orderBy(({ activities: item }) => item.scheduledAt, "asc") : undefined,
  }, [canReadActivities]);
  const { data: externalCalendarEvents = [] } = useLiveQuery({
    query: (q) => canReadActivities ? q.from({ calendarEvents: getCalendarEventsCollection() }).orderBy(({ calendarEvents: item }) => item.startsAt, "asc") : undefined,
  }, [canReadActivities]);
  const canReadCatalog = session?.capabilities.includes("catalog:read") ?? false;
  const { data: dealItems = [] } = useLiveQuery({ query: (q) => q.from({ items: getDealProductsCollection() }).where(({ items: item }) => eq(item.dealId, params.dealId)).orderBy(({ items: item }) => item.sortOrder, "asc") });
  const { data: catalog = [], isLoading: catalogLoading } = useLiveQuery({ query: (q) => canReadCatalog && (itemModalOpen || embeddedItemEditorOpen) ? q.from({ products: getProductsCollection() }).orderBy(({ products: product }) => product.name, "asc") : undefined }, [canReadCatalog, embeddedItemEditorOpen, itemModalOpen]);
  const { data: dealNotes = [] } = useLiveQuery({ query: (q) => q.from({ notes: getNotesCollection() }).where(({ notes: note }) => eq(note.dealId, params.dealId)).orderBy(({ notes: note }) => note.createdAt, "desc") });
  const { data: fieldRules = [] } = useLiveQuery({ query: (q) => q.from({ rules: getStageFieldRulesCollection() }) });
  const { data: customFields = [] } = useLiveQuery({ query: (q) => q.from({ fields: getCustomFieldsCollection() }).where(({ fields: field }) => eq(field.entityType, "deal")).orderBy(({ fields: field }) => field.label, "asc") });
  const { data: events = [] } = useLiveQuery({ query: (q) => q.from({ events: getDealEventsCollection(dealIdFactory.from(params.dealId)) }).orderBy(({ events: item }) => item.occurredAt, "desc") });
  const showConversations = openSections.includes("conversas");
  const { data: conversations = [], isLoading: conversationsLoading } = useLiveQuery({ query: (q) => canReadInbox && showConversations && deal?.contactId ? q.from({ conversations: getConversationsCollection() }).where(({ conversations: item }) => eq(item.contactId, deal.contactId!)).orderBy(({ conversations: item }) => item.lastMessageAt, "desc") : undefined }, [canReadInbox, showConversations, deal?.contactId]);

  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [activityType, setActivityType] = useState<ActivityType>("task");
  const [activityTitle, setActivityTitle] = useState("");
  const [activityDescription, setActivityDescription] = useState("");
  const [activityNotes, setActivityNotes] = useState("");
  const [activityStartDate, setActivityStartDate] = useState("");
  const [activityStartTime, setActivityStartTime] = useState("");
  const [activityEndDate, setActivityEndDate] = useState("");
  const [activityEndTime, setActivityEndTime] = useState("");
  const [activityLocation, setActivityLocation] = useState("");
  const [activityVideoCallUrl, setActivityVideoCallUrl] = useState("");
  const [activityPriority, setActivityPriority] = useState<ActivityPriority>("none");
  const [activityAvailability, setActivityAvailability] = useState<ActivityAvailability>("free");
  const [activityOwnerId, setActivityOwnerId] = useState("");
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
  const [noteEditorOpen, setNoteEditorOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [itemProductId, setItemProductId] = useState("");
  const [itemName, setItemName] = useState("");
  const [itemQuantity, setItemQuantity] = useState("1");
  const [itemUnitAmount, setItemUnitAmount] = useState<Money | null>(null);
  const [itemDiscount, setItemDiscount] = useState<number | null>(0);
  const [itemTax, setItemTax] = useState<number | null>(0);
  const [busyActivityId, setBusyActivityId] = useState<string | null>(null);
  const [lossModalOpen, setLossModalOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [followerModalOpen, setFollowerModalOpen] = useState(false);
  const [selectedFollower, setSelectedFollower] = useState<SelectOption | null>(null);
  const [busyFollowerId, setBusyFollowerId] = useState<string | null>(null);
  const [lossReason, setLossReason] = useState("");
  const [reopening, setReopening] = useState(false);
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [stageClock, setStageClock] = useState(() => Date.now());
  const compactStageUi = useCompactStageViewport();

  const pipelineStages = deal ? stages.filter((stage) => stage.pipelineId === deal.pipelineId) : [];
  const pipeline = deal ? pipelines.find((item) => item.id === deal.pipelineId) : undefined;
  const stage = deal ? stages.find((item) => item.id === deal.stageId) : undefined;
  const linkedContact = deal?.contactId ? contacts.find((item) => item.id === deal.contactId) : undefined;
  const owner = deal?.ownerId ? users.find((item) => item.id === deal.ownerId) : undefined;
  const followerUsers = followers.flatMap((follower) => {
    const user = users.find((item) => item.id === follower.userId);
    return user ? [user] : [];
  });
  const followerOptions = users.filter((item) => !item.deactivatedAt && !followers.some((follower) => follower.userId === item.id)).map(userSelectOption);
  const linkedCompany = deal?.companyId ? companies.find((item) => item.id === deal.companyId) : undefined;
  const contactOptions = useMemo(() => contacts.filter((item) => !item.deletedAt).map((item) => ({ value: item.id, label: item.name, description: [item.email, item.phone].filter(Boolean).join(" · "), avatar: null })), [contacts]);
  const { data: companyLinks = [], isLoading: linksLoading } = useLiveQuery({ query: (q) => q.from({ links: getContactCompaniesCollection() }) });
  const [pendingLink, setPendingLink] = useState<{ contactId: string; companyId: string } | null>(null);
  const companyOptions = useMemo(() => companies.filter((item) => !item.deletedAt).map((item) => {
    const linked = contacts.find((contact) => contact.id === deal?.contactId)?.companyId === item.id || companyLinks.some((link) => link.contactId === deal?.contactId && link.companyId === item.id);
    return { value: item.id, label: item.name, description: [item.taxId, item.website ?? item.email ?? item.legalName].filter(Boolean).join(" · "), avatar: null, group: linked ? "Empresas desta pessoa" : "Outras empresas", linked };
  }).sort((a, b) => Number(b.linked) - Number(a.linked)), [companies, companyLinks, contacts, deal?.contactId]);

  const orderedActivities = useMemo(() => [...activities].sort((left, right) => Number(left.completed) - Number(right.completed) || left.scheduledAt.localeCompare(right.scheduledAt)), [activities]);
  // Valores vindos das colunas tipadas, não do jsonb (ADR-0035).
  const customValues = useCustomFieldValues("deal", params.dealId, customFields);
  const fieldOptions = useCustomFieldOptions();
  const isOpen = deal?.status === "open";
  useEffect(() => {
    if (!isOpen) return;
    const timer = window.setInterval(() => setStageClock(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, [isOpen]);
  /* Tempo em cada etapa, reconstruído do histórico (packages/core/rules/stageDuration) —
   * sem coluna nova: os eventos de mudança já contam essa história. */
  const stageTiming = useMemo(() => {
    if (!deal) return { durations: {}, details: {} };
    const changes = events
      .filter((event) => event.type === "deal.stage_changed")
      .map((event) => ({ stageId: String((event.data as { stageId?: string } | null)?.stageId ?? ""), occurredAt: event.occurredAt, sequence: event.id }))
      .filter((change) => change.stageId);
    const createdEvent = events.find((event) => event.type === "deal.created");
    const createdStageId = String((createdEvent?.data as { stageId?: string } | undefined)?.stageId ?? "");
    const firstStage = createdStageId || pipelineStages[0]?.id || deal.stageId;
    const now = new Date(stageClock);
    const visits = stageVisits(deal.createdAt, firstStage, changes, now);
    const totals = millisecondsByStage(visits, now);
    const latestByStage = millisecondsOfLatestVisitByStage(visits, now);
    return {
      durations: Object.fromEntries([...latestByStage].map(([stageId, ms]) => [stageId, formatStageDuration(ms)])),
      details: Object.fromEntries([...totals].map(([stageId, ms]) => {
        const stageVisitsForId = visits.filter((visit) => visit.stageId === stageId);
        const latest = stageVisitsForId.at(-1);
        const passages = stageVisitsForId.map((visit) => {
          const end = visit.leftAt ? new Date(visit.leftAt) : now;
          return {
            duration: formatDetailedStageDuration(Math.max(0, end.getTime() - new Date(visit.enteredAt).getTime())),
            period: visit.leftAt ? formatStagePeriod(visit.enteredAt, visit.leftAt) : formatStageSince(visit.enteredAt),
            current: visit.leftAt === null,
            arrival: visit.enteredFromStageId ? transitionDescription(visit.enteredFromStageId, visit.stageId, pipelineStages) : { direction: "created" as const, label: "Negócio criado nesta etapa" },
            ...(visit.leftToStageId ? { departure: transitionDescription(visit.stageId, visit.leftToStageId, pipelineStages) } : {}),
          };
        }).reverse();
        return [stageId, {
          duration: formatDetailedStageDuration(latestByStage.get(stageId) ?? 0),
          totalDuration: formatDetailedStageDuration(ms),
          ...(latest ? { period: latest.leftAt ? `Última passagem: ${formatStagePeriod(latest.enteredAt, latest.leftAt)}` : formatStageSince(latest.enteredAt) } : {}),
          passages,
        }];
      })),
    };
  }, [deal, events, pipelineStages, stageClock]);
  const selectedStage = pipelineStages.find((item) => item.id === selectedStageId);
  const selectedStageDetails = selectedStageId ? stageTiming.details[selectedStageId] : undefined;
  const selectedStageCheck = deal && selectedStageId ? evaluateStageFields({ deal: { ...deal, customFields: customValues }, productCount: dealItems.length, rules: fieldRules, stages: pipelineStages, targetStageId: selectedStageId }) : null;

  /* O que falta na etapa atual, agrupado pela seção do painel onde se
   * preenche. É isso que vira a marca na aba fechada: dizer que «origem está
   * vazia» sem dizer onde obriga a abrir seção por seção. */
  const faltando = useMemo(() => {
    if (!deal) return { resumo: null, detalhes: null };
    const gaps = stageFieldGaps({ deal: { ...deal, customFields: customValues }, productCount: dealItems.length, rules: fieldRules });
    const marca = (dentro: typeof gaps) => {
      if (dentro.length === 0) return null;
      const obrigatorios = dentro.filter((issue) => issue.level === "required").length;
      const level = obrigatorios > 0 ? "required" as const : "important" as const;
      const quantos = obrigatorios > 0 ? obrigatorios : dentro.length;
      const nomes = dentro.map((issue) => stageFieldLabel(issue.fieldKey, customFields));
      return { level, count: quantos, label: stageFieldMessage(level, nomes) };
    };
    return {
      resumo: marca(gaps.filter((issue) => !issue.fieldKey.startsWith("custom:"))),
      detalhes: marca(gaps.filter((issue) => issue.fieldKey.startsWith("custom:"))),
    };
  }, [customFields, customValues, deal, dealItems.length, fieldRules]);
  const itemsSummary = useMemo(() => dealProductsSummary(dealItems.map((item) => ({ ...item, unitAmount: syncedAmount(item.unitAmount) }))), [dealItems]);
  const itemPreview = useMemo(() => {
    const quantityMilli = parseQuantity(itemQuantity);
    if (quantityMilli === null || itemUnitAmount === null || itemDiscount === null || itemTax === null) return null;
    try {
      return dealProductTotals({ quantityMilli, unitAmount: itemUnitAmount, discountBasisPoints: itemDiscount, taxBasisPoints: itemTax });
    } catch (error) {
      if (error instanceof InvalidMoneyError) return null;
      throw error;
    }
  }, [itemQuantity, itemUnitAmount, itemDiscount, itemTax]);
  // «Foco» é o que ainda não foi feito, do mais antigo para o mais novo — o que
  // venceu aparece primeiro; «Histórico» guarda o que já foi concluído.
  const focusActivities = useMemo(() => orderedActivities.filter((activity) => !activity.completed), [orderedActivities]);
  const doneActivities = useMemo(() => orderedActivities.filter((activity) => activity.completed).reverse(), [orderedActivities]);
  async function selectParties(contactId: string | null, companyId: string | null) {
    if (!deal) return;
    if (companyId && !contactId) {
      notify({ title: "Selecione uma pessoa primeiro", description: "O negócio precisa de uma pessoa vinculada à empresa.", tone: "error" }); return;
    }
    const linked = !companyId || contacts.find((item) => item.id === contactId)?.companyId === companyId || companyLinks.some((link) => link.contactId === contactId && link.companyId === companyId);
    if (!linked && contactId && companyId) { setPendingLink({ contactId, companyId }); return; }
    await saveField({ contactId: contactId ? contactIdFactory.from(contactId) : null, companyId: companyId ? companyIdFactory.from(companyId) : null }, "Pessoa e empresa");
  }

  const timelineItems = useMemo(() => groupTimelineEvents(events, { users, stages, contacts, companies, customFields }), [companies, contacts, customFields, events, stages, users]);
  const scheduledAt = activityStartDate && activityStartTime ? `${activityStartDate}T${activityStartTime}` : "";
  const activityEndsAtValue = activityEndDate && activityEndTime ? `${activityEndDate}T${activityEndTime}` : "";
  const scheduledDate = scheduledAt ? new Date(scheduledAt) : null;
  const activityDuration = scheduledDate && activityEndsAtValue
    ? Math.max(0, Math.round((new Date(activityEndsAtValue).getTime() - scheduledDate.getTime()) / 60_000))
    : 0;
  const scheduledDayActivities = useMemo(() => scheduledDate && !Number.isNaN(scheduledDate.getTime())
    ? calendarActivities.filter((activity) => isSameLocalDay(new Date(activity.scheduledAt), scheduledDate)
      && activity.id !== editingActivityId
      && (!activityOwnerId || activity.ownerId === activityOwnerId))
    : [], [activityOwnerId, calendarActivities, editingActivityId, scheduledAt]);
  const scheduledDayExternal = useMemo(() => scheduledDate && !Number.isNaN(scheduledDate.getTime())
    ? externalCalendarEvents.filter((event) => event.status !== "cancelled" && isSameLocalDay(new Date(event.startsAt), scheduledDate) && (!activityOwnerId || event.ownerId === activityOwnerId))
    : [], [activityOwnerId, externalCalendarEvents, scheduledAt]);
  const scheduleConflicts = useMemo(() => {
    if (!scheduledDate || Number.isNaN(scheduledDate.getTime()) || !activityEndsAtValue) return new Set<string>();
    const candidate = {
      id: editingActivityId ?? "draft",
      ownerId: activityOwnerId || null,
      startsAt: scheduledDate.toISOString(),
      endsAt: new Date(activityEndsAtValue).toISOString(),
      availability: activityAvailability,
    };
    const internalIntervals = calendarActivities.filter((activity) => !activity.completed).map((activity) => ({
      id: activity.id,
      ownerId: activity.ownerId,
      startsAt: activity.scheduledAt,
      endsAt: activityEndsAt(activity),
      availability: activity.availability,
    }));
    const externalIntervals = externalCalendarEvents.filter((event) => event.status !== "cancelled").map((event) => ({ id: event.id, ownerId: event.ownerId, startsAt: event.startsAt, endsAt: event.endsAt, availability: event.availability }));
    const conflicts = overlappingScheduleIntervals(candidate, [...internalIntervals, ...externalIntervals]);
    return new Set(conflicts.map((conflict) => conflict.id));
  }, [activityAvailability, activityEndsAtValue, activityOwnerId, calendarActivities, editingActivityId, externalCalendarEvents, scheduledAt]);

  async function changeOwner(nextOwnerId: string | null) {
    if (!deal || !canWrite) return;
    try {
      await writeAccepted((metadata) => dealsCollection.update(deal.id, { metadata }, (draft) => { draft.ownerId = nextOwnerId ? userIdFactory.from(nextOwnerId) : null; }));
      notify({ title: "Responsável atualizado", tone: "success" });
    } catch {
      notify({ title: "Não foi possível trocar o responsável", tone: "error" });
    }
  }

  const addFollower = async (nextUserId = selectedFollower?.value) => {
    if (!deal || !session || !nextUserId || !canWrite) throw new Error("Escolha uma pessoa para seguir o negócio.");
    setBusyFollowerId(nextUserId);
    try {
      const user = userIdFactory.from(nextUserId);
      const follower = optimisticDealFollower(dealIdFactory.from(deal.id), user, session.orgId, userIdFactory.from(session.userId));
      await followersCollection.insert(follower).isPersisted.promise;
      setSelectedFollower(null);
      notify({ title: "Seguidor adicionado", description: users.find((item) => item.id === nextUserId)?.name ?? "Usuário", tone: "success" });
    } finally {
      setBusyFollowerId(null);
    }
  }

  async function removeFollower(followerUserId: string) {
    if (!deal || !canWrite) return;
    setBusyFollowerId(followerUserId);
    try {
      await followersCollection.delete(`${deal.id}:${followerUserId}`).isPersisted.promise;
      notify({ title: "Seguidor removido", description: users.find((item) => item.id === followerUserId)?.name ?? "Usuário", tone: "success" });
    } catch {
      notify({ title: "Não foi possível remover o seguidor", tone: "error" });
    } finally {
      setBusyFollowerId(null);
    }
  }

  async function saveNote() {
    const body = noteDraft.trim();
    if (!deal || !session || !body || savingNote) return;
    setSavingNote(true);
    try {
      const note = optimisticNote({ dealId: dealIdFactory.from(deal.id), contactId: deal.contactId, body }, session.orgId, userIdFactory.from(session.userId));
      await notesCollection.insert(note).isPersisted.promise;
      setNoteDraft("");
      setNoteEditorOpen(false);
      notify({ title: "Nota registrada", description: "Disponível no histórico do negócio.", tone: "success" });
    } catch {
      notify({ title: "Não foi possível salvar a nota", tone: "error" });
    } finally {
      setSavingNote(false);
    }
  }

  async function removeNote(note: Note) {
    try {
      await notesCollection.delete(note.id).isPersisted.promise;
      notify({ title: "Nota removida", tone: "success" });
    } catch {
      notify({ title: "Não foi possível remover a nota", tone: "error" });
    }
  }

  function openItemEditor(item?: DealProduct) {
    if (item) {
      setEditingItemId(item.id);
      setItemProductId(item.productId ?? "");
      setItemName(item.name);
      setItemQuantity(formatQuantity(item.quantityMilli));
      setItemUnitAmount(syncedAmount(item.unitAmount));
      setItemDiscount(item.discountBasisPoints);
      setItemTax(item.taxBasisPoints);
    } else {
      setEditingItemId(null); setItemProductId(""); setItemName(""); setItemQuantity("1"); setItemUnitAmount(null); setItemDiscount(0); setItemTax(0);
    }
    if (embedded) setEmbeddedItemEditorOpen(true);
    else setItemModalOpen(true);
  }

  /** Escolher um produto do catálogo copia nome e preço — dali em diante o item é do negócio. */
  function pickCatalogProduct(productId: string | null) {
    setItemProductId(productId ?? "");
    const product = catalog.find((item) => item.id === productId);
    if (product) { setItemName(product.name); setItemUnitAmount(syncedAmount(product.price)); }
  }

  async function saveItem() {
    if (!deal || !session) throw new Error("Sessão expirada. Entre de novo para salvar.");
    const quantityMilli = parseQuantity(itemQuantity);
    const discountBasisPoints = itemDiscount;
    const taxBasisPoints = itemTax;
    // Uma mensagem por campo: dizer «preencha nome, quantidade e preço» com os
    // três preenchidos não ajuda ninguém a descobrir o que está errado.
    if (!itemName.trim()) throw new Error("Escreva o nome do item.");
    if (quantityMilli === null) throw new Error("A quantidade precisa ser um número maior que zero.");
    if (itemUnitAmount === null) throw new Error("Informe o preço unitário.");
    if (discountBasisPoints === null) throw new Error("O desconto vai de 0% a 100%.");
    if (taxBasisPoints === null) throw new Error("O imposto vai de 0% a 100%.");
    const fields = { name: itemName.trim(), quantityMilli, unitAmount: itemUnitAmount, discountBasisPoints, taxBasisPoints };
    if (editingItemId) {
      const transaction = itemsCollection.update(editingItemId, (draft) => { Object.assign(draft, { ...fields, unitAmount: toCents(fields.unitAmount) }); });
      await transaction.isPersisted.promise;
      notify({ title: "Item atualizado", description: fields.name, tone: "success" });
    } else {
      const item = optimisticDealProduct({
        dealId: dealIdFactory.from(deal.id),
        productId: itemProductId ? productIdFactory.from(itemProductId) : null,
        variantId: null,
        sortOrder: dealItems.length,
        ...fields,
      }, session.orgId);
      const transaction = itemsCollection.insert(itemForInsert(item));
      await transaction.isPersisted.promise;
      notify({ title: "Item adicionado", description: item.name, tone: "success" });
    }
    setEditingItemId(null);
    setEmbeddedItemEditorOpen(false);
  }

  async function removeItem(item: DealProduct) {
    try {
      const transaction = itemsCollection.delete(item.id);
      await transaction.isPersisted.promise;
      notify({ title: "Item removido", description: item.name, tone: "success" });
    } catch {
      notify({ title: "Não foi possível remover o item", tone: "error" });
    }
  }

  /** Desfazer o fechamento: volta para em aberto e limpa o motivo da perda. */
  async function reopenDeal() {
    if (!deal || !canMove) return;
    setReopening(true);
    try {
      await writeAccepted((metadata) => dealsCollection.update(deal.id, { metadata }, (draft) => { draft.status = "open"; draft.lossReason = null; }));
      notify({ title: "Negócio reaberto", tone: "success" });
    } catch {
      notify({ title: "Não foi possível reabrir o negócio", tone: "error" });
    } finally {
      setReopening(false);
    }
  }

  /* Abrir a pessoa ou a empresa NÃO troca de tela: entra por cima, num painel
   * que deixa ver o negócio por baixo. Sair de um negócio para consultar um
   * telefone e ter de voltar é o atrito que isso remove. */

  type DealPatch = Partial<Pick<Deal, "name" | "ownerId" | "companyId" | "contactId" | "expectedCloseDate">>;

  /**
   * Grava um campo do negócio direto da linha do painel (Pipedrive: sem
   * formulário, sem modal). O valor NÃO está entre eles: ele é a soma dos
   * produtos, e mudar um número solto faria a conta mentir.
   */
  async function saveField(patch: DealPatch, label: string) {
    if (!deal || !canWrite) return;
    try {
      await writeAccepted((metadata) => dealsCollection.update(deal.id, { metadata }, (draft) => { Object.assign(draft, patch); }));
    } catch (cause) {
      notify({ title: `Não foi possível alterar ${label.toLowerCase()}`, tone: "error" });
      throw cause;
    }
  }

  async function moveDeal(value: string | null) {
    if (!deal || !value || !canMove) return;
    // Obrigatório é obrigatório: a etapa não muda com campo do caminho vazio.
    const check = evaluateStageFields({ deal: { ...deal, customFields: customValues }, productCount: dealItems.length, rules: fieldRules, stages: pipelineStages, targetStageId: value });
    if (check.blocking.length > 0) {
      throw new Error(stageFieldMessage("required", check.blocking.map((issue) => stageFieldLabel(issue.fieldKey, customFields)), pipelineStages.find((item) => item.id === value)?.name));
    }
    try {
      await writeAccepted((metadata) => dealsCollection.update(deal.id, { metadata }, (draft) => { draft.stageId = stageIdFactory.from(value); }));
      notify({ title: "Etapa atualizada", tone: "success" });
    } catch (cause) {
      throw new Error(cause instanceof Error && cause.message ? cause.message : "Não foi possível mudar a etapa.");
    }
  }

  async function closeDeal(status: Extract<DealStatus, "won" | "lost">, reason?: string) {
    if (!deal || !canMove) throw new Error("FORBIDDEN");
    await writeAccepted((metadata) => dealsCollection.update(deal.id, { metadata }, (draft) => {
      draft.status = status;
      draft.lossReason = status === "lost" ? reason?.trim() || null : null;
    }));
    celebrateDealOutcome({ status, name: deal.name });
    notify({ title: status === "won" ? "Negócio ganho" : "Negócio perdido", tone: status === "won" ? "success" : "warning" });
  }

  const openActivityModal = (activity?: Activity, requestedType: ActivityType = "task") => {
    if (activity) {
      setEditingActivityId(activity.id);
      setActivityType(activity.type);
      setActivityTitle(activity.title);
      setActivityDescription(activity.description ?? "");
      setActivityNotes(activity.notes ?? "");
      const start = toLocalDateTimeParts(activity.scheduledAt);
      const end = toLocalDateTimeParts(activityEndsAt(activity));
      setActivityStartDate(start.date); setActivityStartTime(start.time);
      setActivityEndDate(end.date); setActivityEndTime(end.time);
      setActivityLocation(activity.location ?? "");
      setActivityVideoCallUrl(activity.videoCallUrl ?? "");
      setActivityPriority(activity.priority);
      setActivityAvailability(activity.availability);
      setActivityOwnerId(activity.ownerId ?? "");
    } else {
      setEditingActivityId(null);
      setActivityType(requestedType);
      setActivityTitle(ACTIVITY_TYPE_LABELS[requestedType]);
      const start = nextHalfHour();
      const end = new Date(start.getTime() + defaultDurationFor(requestedType) * 60_000);
      const startParts = toLocalDateTimeParts(start); const endParts = toLocalDateTimeParts(end);
      setActivityDescription(""); setActivityNotes(""); setActivityStartDate(startParts.date); setActivityStartTime(startParts.time);
      setActivityEndDate(endParts.date); setActivityEndTime(endParts.time); setActivityLocation(""); setActivityVideoCallUrl("");
      setActivityPriority("none"); setActivityAvailability("free"); setActivityOwnerId(deal?.ownerId ?? session?.userId ?? "");
    }
    setActivityModalOpen(true);
  }

  function changeActivityType(nextType: ActivityType) {
    setActivityType(nextType);
    if (!editingActivityId && activityTitle === ACTIVITY_TYPE_LABELS[activityType]) setActivityTitle(ACTIVITY_TYPE_LABELS[nextType]);
    if (!editingActivityId && scheduledDate) {
      const end = new Date(scheduledDate.getTime() + defaultDurationFor(nextType) * 60_000);
      const parts = toLocalDateTimeParts(end);
      setActivityEndDate(parts.date); setActivityEndTime(parts.time);
    }
    if (nextType !== "meeting") setActivityVideoCallUrl("");
    if (nextType !== "meeting" && nextType !== "lunch") setActivityLocation("");
  }

  function changeActivityStart(date: string, time: string) {
    const previousStart = scheduledAt ? new Date(scheduledAt) : null;
    const previousEnd = activityEndsAtValue ? new Date(activityEndsAtValue) : null;
    const preservedDuration = previousStart && previousEnd ? Math.max(0, previousEnd.getTime() - previousStart.getTime()) : defaultDurationFor(activityType) * 60_000;
    setActivityStartDate(date); setActivityStartTime(time);
    if (!date || !time) return;
    const nextStart = new Date(`${date}T${time}`);
    if (Number.isNaN(nextStart.getTime())) return;
    const nextEnd = toLocalDateTimeParts(new Date(nextStart.getTime() + preservedDuration));
    setActivityEndDate(nextEnd.date); setActivityEndTime(nextEnd.time);
  }

  async function saveActivity() {
    if (!deal || !session) throw new Error("Sessão expirada. Entre de novo para agendar.");
    if (!activityTitle.trim()) throw new Error("Escreva o título da atividade.");
    if (!scheduledAt || Number.isNaN(new Date(scheduledAt).getTime())) throw new Error("Escolha a data e a hora de início.");
    if (!activityEndsAtValue || Number.isNaN(new Date(activityEndsAtValue).getTime())) throw new Error("Escolha a data e a hora de fim.");
    if (new Date(activityEndsAtValue) < new Date(scheduledAt)) throw new Error("O fim não pode acontecer antes do início.");
    if (activityVideoCallUrl.trim()) {
      try { new URL(activityVideoCallUrl.trim()); } catch { throw new Error("Informe um link completo e válido para a videochamada."); }
    }
    const fields = {
      type: activityType,
      title: activityTitle.trim(),
      description: activityDescription.trim() || null,
      notes: activityNotes.trim() || null,
      scheduledAt: new Date(scheduledAt).toISOString(),
      durationMinutes: activityDuration,
      location: activityLocation.trim() || null,
      videoCallUrl: activityVideoCallUrl.trim() || null,
      priority: activityPriority,
      availability: activityAvailability,
      ownerId: activityOwnerId ? userIdFactory.from(activityOwnerId) : null,
    };
    if (editingActivityId) {
      const transaction = activitiesCollection.update(editingActivityId, (draft) => { Object.assign(draft, fields); });
      await transaction.isPersisted.promise;
      notify({ title: "Atividade atualizada", description: fields.title, tone: "success" });
    } else {
      const activity = optimisticActivity({ contactId: deal.contactId, dealId: dealIdFactory.from(deal.id), ...fields }, session.orgId);
      const transaction = activitiesCollection.insert(activity);
      await transaction.isPersisted.promise;
      notify({ title: "Atividade agendada", description: activity.title, tone: "success" });
    }
    setEditingActivityId(null);
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
    return <PageFrame className={styles.page}><BackLink render={<Link to="/deals" />}>Voltar aos negócios</BackLink>{isLoading ? <div className={styles.loading} role="status" aria-label="Carregando negócio"><Skeleton className={styles.loadingLine} /><Skeleton className={styles.loadingLine} /><Skeleton className={styles.loadingLine} /></div> : <Text tone="secondary">Negócio não encontrado.</Text>}</PageFrame>;
  }

  const nowIso = new Date().toISOString();
  const providerLabel = (provider: CalendarEvent["provider"]) => ({ google_calendar: "Google", outlook_calendar: "Outlook", apple_calendar: "Apple" }[provider]);

  const scheduleAction = canWriteActivities ? <MenuButton size="sm" variant="primary" icon={<Icon name="plus" />} menu={<MenuGroup label="Tipo de atividade">
    {ACTIVITY_COMPOSER_TABS.filter(tab => tab.id !== "note").map(tab => <MenuItem key={tab.id} icon={<Icon name={tab.icon} />} onClick={() => { if (tab.id !== "note") openActivityModal(undefined, tab.id); }}>{tab.label}</MenuItem>)}
  </MenuGroup>}>Agendar atividade</MenuButton> : undefined;
  const composerContent = noteEditorOpen && <div className={styles.noteComposer}>
    <Textarea autoFocus aria-label="Nova nota" disabled={!canWrite || savingNote} rows={4} value={noteDraft} placeholder="Registre o que foi conversado…" onChange={event => setNoteDraft(event.target.value)} onKeyDown={event => { if ((event.metaKey || event.ctrlKey) && event.key === "Enter" && noteDraft.trim() && !savingNote) { event.preventDefault(); void saveNote(); } }} />
    <div className={styles.noteActions}>
      <Button size="sm" variant="ghost" onClick={() => setNoteEditorOpen(false)}>Fechar</Button>
      <Button size="sm" disabled={!noteDraft.trim()} loading={savingNote} onClick={() => void saveNote()}>Salvar nota</Button>
    </div>
  </div>;

  /** A lista mantém a conclusão junto do título e o prazo junto do tipo. */
  const activityRow = (activity: Activity, index: number) => {
    const overdue = !activity.completed && activity.scheduledAt < nowIso;
    const kind = activityTypeLabel(activity.type);
    return <ListRow
      key={activity.id}
      index={index}
      leading={canWriteActivities ? <Checkbox aria-label={`${activity.completed ? "Reabrir" : "Concluir"} ${activity.title}`} checked={activity.completed} disabled={busyActivityId === activity.id} onCheckedChange={() => void toggleActivity(activity)}>{null}</Checkbox> : <IconTile icon={ACTIVITY_ICONS[activity.type]} size="sm" />}
      done={activity.completed}
      title={activity.title}
      description={<span className={styles.activityMeta}><Text as="span" size="pequeno" tone="secondary">{kind}</Text><Signal tone={overdue ? "danger" : "neutral"}>{overdue ? "Atrasada · " : ""}{formatDateTime(activity.scheduledAt)}</Signal></span>}
      detail={activity.description || undefined}
      trailing={canWriteActivities ? <Button size="sm" variant="ghost" iconOnly icon={<Icon name="pencil" />} aria-label={`Editar ${activity.title}`} onClick={() => openActivityModal(activity)} /> : undefined}
    />;
  };

  const activitiesContent = <div className={styles.pageActivity}>
    <RecordSection title="Próximas atividades" actions={<><Button size="sm" variant="secondary" icon={<Icon name="file" />} disabled={!canWrite} onClick={() => setNoteEditorOpen(open => !open)}>Adicionar nota</Button>{scheduleAction}</>}>
      {composerContent}
      {canReadActivities && (focusActivities.length === 0
        ? <EmptyState variant="onboarding" icon="calendar" title="Nenhuma atividade agendada" description="Agende o próximo passo para este negócio." />
        : <RowList label="Atividades pendentes">{focusActivities.map(activityRow)}</RowList>)}
    </RecordSection>
    {canReadActivities && doneActivities.length > 0 && <RecordSection title="Concluídas" count={doneActivities.length}>
      <RowList label="Atividades concluídas">{doneActivities.map(activityRow)}</RowList>
    </RecordSection>}
  </div>;

  const historyContent = <RecordSection title="Histórico" actions={<Button size="sm" variant="ghost" trailingIcon={<Icon name="right" />} onClick={() => setHistoryOpen(true)}>Expandir</Button>}>
      <div className={styles.historyTabs}><Tabs variant="segmented" label="Filtrar o histórico" defaultValue="tudo" items={[
        { value: "tudo", label: "Tudo", content: <Timeline collapseChanges items={timelineItems} initialCount={10} pageSize={10} density="compact" groupByDay emptyText="As próximas alterações deste negócio aparecerão aqui." /> },
        { value: "notas", label: `Notas (${dealNotes.length})`, content: dealNotes.length === 0
          ? <Text size="pequeno" tone="muted">Nenhuma nota registrada neste negócio.</Text>
          : <div className={styles.notes}>{dealNotes.map((note) => { const author = users.find((user) => user.id === note.authorId); return <NoteCard key={note.id} author={author?.name ?? "Alguém"} authorAvatarUrl={author?.avatarUrl ?? null} createdAt={note.createdAt} body={note.body} onRemove={note.authorId === session?.userId ? () => void removeNote(note) : undefined} />; })}</div> },
        { value: "mudancas", label: "Mudanças", content: <Timeline collapseChanges items={groupTimelineEvents(events.filter((item) => item.type !== "activity.created"), { users, stages, contacts, companies, customFields })} initialCount={10} pageSize={10} density="compact" groupByDay emptyText="Nenhuma mudança registrada." /> },
      ]} /></div>
    </RecordSection>;
  const activityHistoryTabs = [
    { value: "atividade", label: "Atividades", icon: <Icon name="calendar" />, ...(canReadActivities ? { count: focusActivities.length } : {}), content: activitiesContent },
    { value: "historico", label: "Histórico", icon: <Icon name="clock" />, content: historyContent },
  ];

  const itemEditorContent = <div className={styles.modalFields}>
    {canReadCatalog && <Field><Label>Do catálogo</Label><SearchSelect label="Produto do catálogo" searchPlacement="field" placeholder={catalogLoading ? "Carregando catálogo…" : "Buscar produto no catálogo (opcional)"} options={catalog.filter((item) => item.active).map((item) => ({ value: item.id, label: item.name, description: `${item.sku} · ${formatBRL(syncedAmount(item.price))}` }))} value={itemProductId ? { value: itemProductId, label: catalog.find((item) => item.id === itemProductId)?.name ?? itemName } : null} onValueChange={(option) => pickCatalogProduct(option?.value ?? null)} /></Field>}
    <Field><Label>Nome do item</Label><Input value={itemName} onChange={(event) => setItemName(event.target.value)} placeholder="Escreva um item avulso ou escolha do catálogo" /></Field>
    <div className={styles.modalLinha}>
      <Field><Label>Quantidade</Label><Input inputMode="decimal" numeric value={itemQuantity} onChange={(event) => setItemQuantity(event.target.value)} placeholder="1" /></Field>
      <Field><Label>Preço unitário</Label><MoneyInput label="Preço unitário" value={itemUnitAmount} onValueChange={setItemUnitAmount} /></Field>
    </div>
    <div className={styles.modalLinha}>
      <Field><Label>Desconto</Label><PercentInput label="Desconto do item" value={itemDiscount} onValueChange={setItemDiscount} /></Field>
      <Field><Label>Imposto</Label><PercentInput label="Imposto do item" value={itemTax} onValueChange={setItemTax} /></Field>
    </div>
    <AmountSummary label="Resumo do item" items={[
      { label: "Subtotal", value: itemPreview ? formatBRL(itemPreview.gross) : "—" },
      { label: "Descontos", value: itemPreview ? `−${formatBRL(itemPreview.discount)}` : "—" },
      { label: "Impostos", value: itemPreview ? `+${formatBRL(itemPreview.tax)}` : "—" },
    ]} totalLabel="Total do item" total={itemPreview ? formatBRL(itemPreview.net) : "—"} />
    {!itemPreview && <Text size="pequeno" tone="muted">Preencha valores válidos para calcular o total.</Text>}
  </div>;

  /* Itens: o valor do negócio nasce aqui (packages/core/rules/dealProducts). */
  const addProductAction = canWrite ? <Button size="sm" variant="secondary" icon={<Icon name="plus" />} onClick={() => openItemEditor()}>Adicionar produto</Button> : undefined;
  const productsContent = <div className={styles.items}>
    {dealItems.length === 0
      ? <Text size="pequeno" tone="muted">O valor do negócio é a soma dos produtos. Adicione o que está sendo vendido.</Text>
      : <>
          <div className={styles.itemList}><RowList label="Itens do negócio">{dealItems.map((item, index) => {
            const totals = dealProductTotals({ ...item, unitAmount: syncedAmount(item.unitAmount) });
            return <ListRow
              key={item.id}
              index={index}
              icon="cart"
              title={item.name}
              description={`${formatQuantity(item.quantityMilli)} × ${formatBRL(syncedAmount(item.unitAmount))}`}
              detail={[
                item.discountBasisPoints > 0 ? `Desconto de ${formatBasisPoints(item.discountBasisPoints)}%` : "",
                item.taxBasisPoints > 0 ? `Imposto de ${formatBasisPoints(item.taxBasisPoints)}%` : "",
              ].filter(Boolean).join(" · ") || undefined}
              meta={<Text size="pequeno" weight="medium" mono>{formatBRL(totals.net)}</Text>}
              trailing={canWrite ? <>
                <Button size="sm" variant="ghost" iconOnly icon={<Icon name="pencil" />} aria-label={`Editar ${item.name}`} onClick={() => openItemEditor(item)} />
                <Button size="sm" variant="ghost" iconOnly icon={<Icon name="trash" />} aria-label={`Remover ${item.name}`} onClick={() => void removeItem(item)} />
              </> : undefined}
            />;
          })}</RowList></div>
          <div className={styles.itemsSummary}><AmountSummary label="Resumo do negócio" items={[
            { label: "Subtotal", value: formatBRL(itemsSummary.gross) },
            { label: "Descontos", value: `−${formatBRL(itemsSummary.discount)}` },
            { label: "Impostos", value: `+${formatBRL(itemsSummary.tax)}` },
          ]} totalLabel="Valor do negócio" total={formatBRL(itemsSummary.net)} /></div>
        </>}
  </div>;

  /* Resumo: todo valor editável passa pelo InlineField — a mesma caixa
   * parada, vazia e editando. */
  function fieldRequirement(key: string) {
    if (!deal) return undefined;
    const rule = fieldRules.find(rule => rule.stageId === deal.stageId && rule.pipelineId === deal.pipelineId && rule.fieldKey === key);
    if (!rule || rule.level === "optional") return undefined;
    return rule.level;
  }
  const openCommercial = () => { if (embedded) setQuickPanel("commercial"); else setPageTab("comercial"); };
  const summaryFields = <div className={styles.fields}>
    <InlineField label="Produtos" empty={dealFieldValue(deal, "products", dealItems.length) == null} requirement={fieldRequirement("products")} value={dealItems.length ? `${dealItems.length} ${dealItems.length === 1 ? "produto" : "produtos"}` : "Adicionar produto"} action={{ label: "Ver itens e valores", icon: "right", onClick: openCommercial }} />
    {fieldRequirement("amount") && <InlineField label="Valor" empty={dealFieldValue(deal, "amount", dealItems.length) == null} requirement={fieldRequirement("amount")} value={formatBRL(dealItems.length > 0 ? itemsSummary.net : syncedAmount(deal.amount))} action={{ label: "Editar itens e valores", icon: "right", onClick: openCommercial }} />}
    <InlineField requirement={fieldRequirement("expectedCloseDate")} label="Previsão" numeric value={deal.expectedCloseDate ? formatDate(deal.expectedCloseDate) : "Sem previsão"} empty={!deal.expectedCloseDate} disabled={!canWrite}>
      {(close) => <DatePicker label="Previsão de fechamento" value={deal.expectedCloseDate?.slice(0, 10) ?? ""} onValueChange={(next) => close(saveField({ expectedCloseDate: next ? new Date(`${next}T12:00:00`).toISOString() : null }, "Previsão"))} />}
    </InlineField>
    <InlineField requirement={fieldRequirement("ownerId")} label="Responsável" value={owner?.name ?? "Não atribuído"} empty={!owner} {...(owner ? { leading: <UserAvatar user={owner} size="small" /> } : {})} disabled={!canWrite}>
      {(close) => <Select label="Responsável pelo negócio" value={deal.ownerId ?? null} placeholder="Não atribuído" options={users.filter((item) => !item.deactivatedAt).map(userSelectOption)} onValueChange={(next) => close(saveField({ ownerId: next ? userIdFactory.from(next) : null }, "Responsável"))} />}
    </InlineField>
    <InlineField requirement={fieldRequirement("contactId")} label="Pessoa" value={linkedContact?.name ?? "Sem pessoa"} {...(linkedContact ? { leading: <Avatar name={linkedContact.name} size="small" />, action: { label: `Abrir ${linkedContact.name}`, icon: "eye" as const, onClick: () => void navigate(`/contacts/${linkedContact.id}?returnTo=${returnTo}`) } } : {})} empty={!linkedContact} disabled={!canWrite || !canReadContacts}>
      {(close) => <RecordSelect label="Pessoa do negócio" placeholder="Nome, e-mail ou telefone…" options={contactOptions} loading={contactsLoading} value={linkedContact ? { value: linkedContact.id, label: linkedContact.name } : null} onCancel={close} emptyOptionLabel="Sem pessoa vinculada" onValueChange={(next) => close((next?.value ?? null) === deal.contactId ? undefined : selectParties(next?.value ?? null, deal.companyId))} />}
    </InlineField>
    <InlineField requirement={fieldRequirement("companyId")} label="Empresa" value={linkedCompany?.name ?? "Sem empresa"} {...(linkedCompany ? { leading: <Avatar name={linkedCompany.name} size="small" />, action: { label: `Abrir ${linkedCompany.name}`, icon: "eye" as const, onClick: () => void navigate(`/companies/${linkedCompany.id}?returnTo=${returnTo}`) } } : {})} empty={!linkedCompany} disabled={!canWrite || !canReadCompanies}>
      {(close) => <RecordSelect label="Empresa do negócio" kind="company" placeholder="Nome, documento ou site…" options={companyOptions} loading={companiesLoading || linksLoading} value={linkedCompany ? { value: linkedCompany.id, label: linkedCompany.name } : null} onCancel={close} emptyOptionLabel="Sem empresa vinculada" onValueChange={(next) => close((next?.value ?? null) === deal.companyId ? undefined : selectParties(deal.contactId, next?.value ?? null))} />}
    </InlineField>
    {deal.status === "lost" && <InlineField label="Motivo da perda" value={deal.lossReason ?? "Não informado"} empty={!deal.lossReason} disabled />}
  </div>;
  const activeCustomFields = customFields.filter((field) => !field.archivedAt);
  const detailsContent = <div className={styles.fields}>
    {activeCustomFields.map((field) => <EnrichedCustomFieldValue
      options={fieldOptions.get(field.id) ?? []}
      key={field.id}
      field={field}
      requirement={fieldRequirement(`custom:${field.key}`)}
      value={customValues[field.key]}
      disabled={!canWrite}
      onSave={(value) => writeAccepted((metadata) => dealsCollection.update(deal.id, { metadata }, (draft) => { draft.customFields = { ...draft.customFields, [field.key]: value }; }))}
      onError={(message) => notify({ title: "Valor inválido", description: message, tone: "error" })}
    />)}
    {activeCustomFields.length === 0 && <Text size="pequeno" tone="muted">Nenhum campo personalizado de negócio. Crie em Configurações · Dados.</Text>}
  </div>;
  const summaryContent = <Accordion density="compact" value={openSections} onValueChange={setOpenSections} items={[
    { value: "resumo", title: "Resumo", icon: <Icon name="chart" />, ...(faltando.resumo ? { badge: faltando.resumo } : {}), content: summaryFields },
    { value: "detalhes", title: "Detalhes", icon: <Icon name="file" />, ...(faltando.detalhes ? { badge: faltando.detalhes } : {}), content: detailsContent },
    /* Pessoa e Empresa não têm seção própria: o resumo já mostra as duas, e
     * o olho leva à mesma ficha completa usada em Pessoas e empresa. */
    ...(canReadInbox ? [{ value: "conversas", title: "Conversas", icon: <Icon name="message" />, content: !deal.contactId
      ? <Text size="pequeno" tone="muted">Vincule uma pessoa para ver o atendimento.</Text>
      : conversationsLoading ? <Skeleton className={styles.loadingLine} />
      : conversations.length === 0
        ? <Text size="pequeno" tone="muted">Nenhuma conversa desta pessoa ainda.</Text>
        : <RowList label="Conversas desta pessoa">{conversations.map((conversation, index) => <ListRow key={conversation.id} index={index} icon="message" title={conversation.subject} description={conversationChannelLabel(conversation.channel)} meta={formatDateTime(conversation.lastMessageAt)} render={<Link to={`/inbox?conversation=${conversation.id}`} />} />)}</RowList> }] : []),
  ]} />;
  const relatedContent = <RelatedRecords compact contactId={deal.contactId} companyId={deal.companyId} disabled={!canWrite} onContact={(person) => { void selectParties(person?.id ?? null, deal.companyId); }} onCompany={(company) => { void selectParties(deal.contactId, company?.id ?? null); }} />;

  const tagsContent = <DealTags value={(tagsByDeal.get(deal.id) ?? []).map((tag) => tag.name)} disabled={!canWrite} onChange={(tags) => { void writeAccepted((metadata) => dealsCollection.update(deal.id, { metadata }, (draft) => { draft.tags = tags; })).catch(() => notify({ title: "Não foi possível salvar as etiquetas", tone: "error" })); }} />;
  const statusChip = deal.status === "open" ? <Chip>{statusLabel(deal.status)}</Chip> : <Chip dot tone={deal.status === "won" ? "success" : "danger"}>{statusLabel(deal.status)}</Chip>;
  /* O valor acompanha a identidade e abre sua composição comercial. */
  const valueContent = <RecordValue onClick={openCommercial} animationPaused={itemModalOpen || itemModalClosing} value={formatBRL(dealItems.length > 0 ? itemsSummary.net : syncedAmount(deal.amount))} hint={isOpen && deal.probabilityBasisPoints != null ? <Text size="legenda" tone="secondary" title={`Estimativa inicial, não calibrada. Base: ${deal.probabilitySampleSize ?? 0} negócios encerrados.`}>{Math.round(deal.probabilityBasisPoints / 100)}% de chance estimada</Text> : undefined} />;
  const moveActions = <DealStageActions
    closed={!isOpen}
    destinations={stage && isOpen && canMove ? pipelineStages.filter((target) => !target.archivedAt && (target.id === stage.id || canMoveBetweenStages(stage, target, transitions))).map((target) => ({ id: target.id, label: target.name, color: target.color, current: target.id === stage.id, detail: target.sortOrder > stage.sortOrder ? "Avançar" : "Retornar" })) : []}
    onMove={(id) => void moveDeal(id).catch((cause: unknown) => notify({ title: "Movimento não concluído", description: cause instanceof Error ? cause.message : "Revise os campos da etapa.", tone: "error" }))}
    onWon={stage && isOpen && canMove && canCloseAtStage(stage, "won") ? () => void closeDeal("won").catch(() => notify({ title: "Não foi possível registrar o ganho", tone: "error" })) : undefined}
    onLost={stage && isOpen && canMove && canCloseAtStage(stage, "lost") ? () => { setLossReason(""); setLossModalOpen(true); } : undefined}
  />;
  const commercialPanel = <div className={styles.quickPanel}>
    <div className={styles.quickPanelHeader}>
      {embedded && <Button variant="ghost" size="sm" icon={<Icon name="left" />} iconOnly aria-label={embeddedItemEditorOpen ? "Voltar aos itens" : "Voltar aos campos"} onClick={() => { if (embeddedItemEditorOpen) setEmbeddedItemEditorOpen(false); else setQuickPanel("stage"); }} />}
      <SectionTitle level="card" actions={!embeddedItemEditorOpen ? addProductAction : undefined} description={embeddedItemEditorOpen ? "Informe os dados do item comercial." : "Produtos, serviços e composição do valor negociado."}>{embeddedItemEditorOpen ? (editingItemId ? "Editar produto" : "Adicionar produto") : "Itens e valores"}</SectionTitle>
    </div>
    {embeddedItemEditorOpen ? <>
      <div className={styles.quickPanelBody}>{itemEditorContent}</div>
      <div className={styles.quickPanelFooter}><Button variant="ghost" onClick={() => setEmbeddedItemEditorOpen(false)}>Cancelar</Button><Button onClick={() => void saveItem().catch((cause: unknown) => notify({ title: "Não foi possível salvar o item", description: cause instanceof Error ? cause.message : "Revise os campos.", tone: "error" }))}>{editingItemId ? "Salvar" : "Adicionar"}</Button></div>
    </> : <div className={styles.quickPanelBody}>{productsContent}</div>}
  </div>;

  /* Responsável e seguidores: o avatar (ou a pilha) mora no encaixe de ícone
   * do botão — os dois rótulos começam no mesmo x. */
  const ownerPicker = <OwnerPicker label="Responsável pelo negócio" people={users} value={deal.ownerId} disabled={!canWrite} onChange={(id) => void changeOwner(id)} />;
  const followersMenu = <MenuButton variant="secondary" disabled={!canWrite} aria-label={`${followers.length} ${followers.length === 1 ? "seguidor" : "seguidores"}. Gerenciar`} icon={followerUsers.length ? <AvatarStack overflow={Math.max(0, followerUsers.length - 3)}>{followerUsers.slice(0, 3).map((user) => <UserAvatar key={user.id} user={user} size="small" />)}</AvatarStack> : <Icon name="team" />} menu={<>
    <MenuGroup label="Seguidores">
      {followerUsers.length === 0 && <MenuNote>Ninguém segue este negócio</MenuNote>}
      {followerUsers.map((user) => <MenuItem key={user.id} icon={<UserAvatar user={user} size="small" />} shortcut="Remover" disabled={busyFollowerId === user.id} onClick={() => void removeFollower(user.id)}>{user.name}</MenuItem>)}
    </MenuGroup>
    <MenuGroup label="Ações">
      {session && !followers.some((follower) => follower.userId === session.userId) && <MenuItem icon={<Icon name="eye" />} disabled={busyFollowerId !== null} onClick={() => void addFollower(session.userId)}>Seguir este negócio</MenuItem>}
      <MenuItem icon={<Icon name="plus" />} disabled={followerOptions.length === 0} onClick={() => setFollowerModalOpen(true)}>Adicionar seguidor</MenuItem>
    </MenuGroup>
  </>}>{followers.length === 0 ? "Seguidores" : `${followers.length} ${followers.length === 1 ? "seguidor" : "seguidores"}`}</MenuButton>;
  const scheduleDateLabel = scheduledDate && !Number.isNaN(scheduledDate.getTime()) ? capitalize(new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long" }).format(scheduledDate)) : "Escolha uma data";

  return <PageFrame className={embedded ? styles.embedded : styles.page}>
    {embedded
      ? <div className={styles.quickHeader}><SectionTitle level="section" as="h2" meta={pipeline?.name ?? "Negócio"} actions={ownerPicker}><InlineEdit label="Título do negócio" value={deal.name} disabled={!canWrite} appearance="title" saveOnBlur onSave={async (draft) => { const next = draft.trim(); if (!next || next.length > 200) throw new Error("Informe um título de até 200 caracteres."); if (next !== deal.name) await saveField({ name: next }, "Título"); }} /></SectionTitle></div>
      : <PageHeader variant="record"
        summary={valueContent}
        back={<BackLink iconOnly render={<Link to="/deals" />}>Voltar aos negócios</BackLink>}
        eyebrow={[pipeline?.name ?? "Funil", stage?.name].filter(Boolean).join(" · ")}
        title={<InlineEdit
          label="Título do negócio"
          value={deal.name}
          disabled={!canWrite}
          appearance="title"
          saveOnBlur
          errorText="O título não pode ficar vazio e precisa ter até 200 caracteres."
          onSave={async (draft) => {
            const next = draft.trim();
            if (!next || next.length > 200) throw new Error("INVALID_DEAL_TITLE");
            if (next !== deal.name) await saveField({ name: next }, "Título");
          }}
        />}
        actions={<div className={styles.headerActions}>
          <div className={styles.headerGroup} aria-label="Equipe do negócio">
            {ownerPicker}
            {followersMenu}
            <ViewerStack viewers={presence.viewers} status={presence.status} {...(session ? { currentUserId: session.userId } : {})} />
          </div>
          <div className={styles.headerGroup}>
            {isOpen && canMove && <>
              <Button variant="secondary" tone="success" icon={<Icon name="check" />} onClick={() => void closeDeal("won").catch(() => notify({ title: "Não foi possível fechar o negócio", tone: "error" }))}>Ganho</Button>
              <Button variant="secondary" tone="danger" icon={<Icon name="close" />} onClick={() => { setLossReason(""); setLossModalOpen(true); }}>Perdido</Button>
            </>}
            {!isOpen && statusChip}
            {!isOpen && canMove && <Button variant="secondary" icon={<Icon name="undo" />} loading={reopening} onClick={() => void reopenDeal()}>Reabrir</Button>}
          </div>
        </div>}
      />}



    {!embedded && pipelineStages.length > 0 && <StageProgress
      stages={pipelineStages.map((item) => ({ id: item.id, label: item.name }))}
      currentId={deal.stageId}
      durations={stageTiming.durations}
      details={stageTiming.details}
      outcome={deal.status === "open" ? undefined : deal.status}
      interaction={compactStageUi ? "modal" : "popover"}
      {...(canMove && isOpen && compactStageUi ? { onSelect: (id: string) => setSelectedStageId(id) } : {})}
      {...(canMove && isOpen && !compactStageUi ? { onMove: (id: string) => moveDeal(id) } : {})}
    />}

    {embedded ? <div className={styles.quickGrid}>
      <div className={styles.quickContext}>
        {valueContent}
        <Surface className={styles.quickTabs}><Tabs label="Contexto do negócio" defaultValue="resumo" items={[
          { value: "resumo", label: "Resumo", content: <div className={styles.stack}>{summaryFields}{tagsContent}</div> },
          { value: "detalhes", label: "Detalhes", content: detailsContent },
          { value: "pessoas", label: "Vínculos", content: relatedContent },
        ]} /></Surface>
      </div>
      <div className={styles.quickPhase}>{quickPanel === "commercial" ? <Surface className={styles.block}>{commercialPanel}</Surface> : <Tabs label="Atividades e histórico do negócio" defaultValue="atividade" items={activityHistoryTabs} />}</div>
      <Surface as="aside" className={styles.quickActions}>{moveActions}</Surface>
    </div> : <RecordWorkspace context={<>{tagsContent}{summaryContent}</>}>
      <div className={styles.workspaceTabs}><Tabs variant="segmented" label="Área de trabalho do negócio" value={pageTab} onValueChange={setPageTab} items={[
        ...activityHistoryTabs,
        { value: "comercial", label: "Itens e valores", icon: <Icon name="cart" />, count: dealItems.length, content: <RecordSection title="Itens do negócio" actions={addProductAction}>{productsContent}</RecordSection> },
        { value: "pessoas", label: "Pessoas e empresa", icon: <Icon name="team" />, content: relatedContent },
      ]} /></div>
    </RecordWorkspace>}

    <ActionModal open={pendingLink !== null} onOpenChange={(open) => { if (!open) setPendingLink(null); }} title="Vincular pessoa à empresa?" confirmLabel="Vincular e adicionar" cancelLabel="Não vincular" onConfirm={async () => {
      if (!pendingLink) return;
      if (!session?.capabilities.includes("contacts:write")) throw new Error("Você precisa de permissão para editar pessoas.");
      await contactsControllerLinkCompany(pendingLink.contactId, { companyId: pendingLink.companyId });
      await saveField({ contactId: contactIdFactory.from(pendingLink.contactId), companyId: companyIdFactory.from(pendingLink.companyId) }, "Pessoa e empresa");
      setPendingLink(null);
    }}>
      <LinkRecordsPreview
        person={contacts.find((item) => item.id === pendingLink?.contactId)?.name ?? "Pessoa"}
        company={companies.find((item) => item.id === pendingLink?.companyId)?.name ?? "Empresa"}
      />
    </ActionModal>

    <ActionModal
      open={selectedStage !== undefined}
      onOpenChange={(open) => { if (!open) setSelectedStageId(null); }}
      title={selectedStage ? selectedStage.name : "Etapa"}
      confirmLabel={selectedStageId === deal.stageId ? "Fechar" : "Mudar para esta etapa"}
      cancelLabel={selectedStageId === deal.stageId ? "Voltar" : "Só visualizar"}
      errorText="Não foi possível mudar a etapa."
      onConfirm={async () => {
        if (!selectedStageId || selectedStageId === deal.stageId) return;
        await moveDeal(selectedStageId);
        setSelectedStageId(null);
      }}
    >
      <div className={styles.stageReview}>
        <Surface elevation="cavada" radius="lista" className={styles.stageReviewSummary}>
          <IconTile icon={selectedStageId === deal.stageId ? "calendar" : "right"} size="sm" surface="folha" />
          <div className={styles.stageReviewCopy}>
            <Text weight="medium">{selectedStageId === deal.stageId ? "Tempo nesta passagem" : `Mover de ${stage?.name ?? "etapa atual"}`}</Text>
            <Text size="pequeno" mono>{selectedStageDetails?.duration ?? "Ainda sem tempo registrado"}</Text>
            {selectedStageDetails?.totalDuration && selectedStageDetails.totalDuration !== selectedStageDetails.duration && <Text size="legenda" tone="muted" mono>Acumulado nesta etapa: {selectedStageDetails.totalDuration}</Text>}
          </div>
        </Surface>
        {selectedStageDetails?.period && <Text size="pequeno" tone="secondary">{selectedStageDetails.period}</Text>}
        {selectedStageDetails?.passages?.length ? <StagePassageHistory passages={selectedStageDetails.passages} /> : null}
        {selectedStageId !== deal.stageId && selectedStageCheck && selectedStageCheck.blocking.length > 0 && <Alert tone="warning" title={stageFieldMessage("required", selectedStageCheck.blocking.map((issue) => stageFieldLabel(issue.fieldKey, customFields)), selectedStage?.name)} />}
        {selectedStageId !== deal.stageId && (!selectedStageCheck || selectedStageCheck.blocking.length === 0) && <Text size="pequeno" tone="secondary">A alteração será salva imediatamente e registrada no histórico do negócio.</Text>}
      </div>
    </ActionModal>

    <ActionModal open={followerModalOpen} onOpenChange={(open) => { setFollowerModalOpen(open); if (!open) setSelectedFollower(null); }} title="Adicionar seguidor" confirmLabel="Adicionar" errorText="Não foi possível adicionar o seguidor." onConfirm={() => addFollower()}>
      <Field><Label>Pessoa</Label><SearchSelect label="Pessoa que seguirá o negócio" searchPlacement="dropdown" placeholder="Buscar pelo nome ou e-mail" emptyText="Todos os usuários ativos já seguem este negócio." options={followerOptions} value={selectedFollower} onValueChange={setSelectedFollower} /></Field>
    </ActionModal>

    <ActionModal open={activityModalOpen} onOpenChange={(open) => { setActivityModalOpen(open); if (!open) setEditingActivityId(null); }} title={editingActivityId ? "Editar atividade" : "Nova atividade"} confirmLabel={editingActivityId ? "Salvar" : "Agendar"} errorText="Não foi possível salvar a atividade." onConfirm={saveActivity} size="workspace">
      <div className={styles.activityModalLayout}>
      <div className={styles.modalFields}>
        <SegmentedControl label="Tipo de atividade" value={activityType} options={ACTIVITY_TYPE_OPTIONS} onValueChange={changeActivityType} />
        <Text size="pequeno" tone="secondary">{ACTIVITY_FORM_HINTS[activityType]}</Text>
        <Field><Label>Título</Label><Input autoFocus value={activityTitle} onChange={(event) => setActivityTitle(event.target.value)} placeholder="Qual é o próximo passo?" /></Field>
        <section className={styles.activityTiming} aria-label="Data, hora e duração">
          <SectionTitle level="block" actions={<Chip>{formatDuration(activityDuration)}</Chip>}>Data e hora</SectionTitle>
          <div className={styles.activityInterval}>
            <Field><Label>Data de início</Label><DatePicker label="Data de início" value={activityStartDate} onValueChange={(value) => changeActivityStart(value, activityStartTime)} /></Field>
            <Field><Label>Hora de início</Label><TimePicker label="Hora de início" value={activityStartTime} onValueChange={(value) => changeActivityStart(activityStartDate, value)} /></Field>
            <Text tone="muted" className={styles.activityIntervalArrow}>→</Text>
            <Field><Label>Data de fim</Label><DatePicker label="Data de fim" value={activityEndDate} onValueChange={setActivityEndDate} /></Field>
            <Field><Label>Hora de fim</Label><TimePicker label="Hora de fim" value={activityEndTime} onValueChange={setActivityEndTime} /></Field>
          </div>
        </section>
        <div className={styles.modalLinha}>
          <Field><Label>Prioridade</Label><Select label="Prioridade da atividade" value={activityPriority} options={PRIORITIES} onValueChange={(value) => { if (value) setActivityPriority(value as ActivityPriority); }} /></Field>
          {activityType !== "deadline" && activityType !== "task" && activityType !== "email" && <Field><Label>Disponibilidade</Label><Select label="Disponibilidade no calendário" value={activityAvailability} options={AVAILABILITIES} onValueChange={(value) => { if (value) setActivityAvailability(value as ActivityAvailability); }} /></Field>}
        </div>
        <div className={styles.modalLinha}>
          <Field><Label>Responsável</Label><SearchSelect label="Responsável pela atividade" searchPlacement="dropdown" placeholder="Buscar usuário" options={users.filter((item) => !item.deactivatedAt).map(userSelectOption)} value={activityOwnerOption(users, activityOwnerId)} onValueChange={(option) => setActivityOwnerId(option?.value ?? "")} /></Field>
          {(activityType === "meeting" || activityType === "lunch") && <Field><Label>Local</Label><Input value={activityLocation} onChange={(event) => setActivityLocation(event.target.value)} placeholder="Sala ou endereço" /></Field>}
        </div>
        {activityType === "meeting" && <Field><Label>Link da videochamada</Label><Input type="url" value={activityVideoCallUrl} onChange={(event) => setActivityVideoCallUrl(event.target.value)} placeholder="https://meet.google.com/…" /></Field>}
        <Field><Label>{activityType === "email" ? "Assunto e contexto" : "Descrição para participantes"}</Label><Textarea value={activityDescription} onChange={(event) => setActivityDescription(event.target.value)} placeholder={activityType === "email" ? "O que deve ser tratado no acompanhamento" : "Pauta e informações que podem aparecer no convite do calendário"} /></Field>
        <Field><Label>Nota interna</Label><Textarea value={activityNotes} onChange={(event) => setActivityNotes(event.target.value)} placeholder="Contexto privado, visível apenas para a equipe" /></Field>
        <Surface as="section" elevation="cavada" radius="lista" className={styles.activityContext} aria-label="Vínculos da atividade">
          <SectionTitle level="block">Vínculos</SectionTitle>
          <div className={styles.chips}>
            <Chip icon="briefcase">{deal.name}</Chip>
            {linkedContact && <Chip icon="user">{linkedContact.name}</Chip>}
            {linkedCompany && <Chip icon="building">{linkedCompany.name}</Chip>}
          </div>
        </Surface>
      </div>
      <Surface as="aside" className={styles.daySchedule} aria-label="Agenda do dia selecionado">
        <SectionTitle level="block" description={`Agenda de ${users.find((item) => item.id === activityOwnerId)?.name ?? "ninguém"}`} actions={<Chip dot tone={scheduleConflicts.size > 0 ? "danger" : "success"}>{scheduleConflicts.size > 0 ? `${scheduleConflicts.size} conflito${scheduleConflicts.size > 1 ? "s" : ""}` : "Horário livre"}</Chip>}>{scheduleDateLabel}</SectionTitle>
        <div className={styles.dayScheduleBody}>
          {scheduledDayActivities.length === 0 && scheduledDayExternal.length === 0
            ? <Text size="pequeno" tone="muted">Nenhum compromisso neste dia.</Text>
            : <RowList label="Compromissos do dia">
                {scheduledDayActivities.map((activity, index) => <ListRow key={activity.id} index={index} icon={ACTIVITY_ICONS[activity.type]} title={activity.title} description={scheduleConflicts.has(activity.id) ? <Signal tone="danger">Conflito · {activityTypeLabel(activity.type)} · Spark</Signal> : `${activityTypeLabel(activity.type)} · Spark`} meta={formatTimeRange(activity.scheduledAt, activity.durationMinutes)} />)}
                {scheduledDayExternal.map((event, index) => <ListRow key={event.id} index={scheduledDayActivities.length + index} icon="calendar" title={event.title} description={scheduleConflicts.has(event.id) ? <Signal tone="danger">Conflito · {event.calendarName} · {providerLabel(event.provider)}</Signal> : `${event.calendarName} · ${providerLabel(event.provider)}`} meta={formatExternalTimeRange(event.startsAt, event.endsAt, event.allDay)} />)}
              </RowList>}
        </div>
        <Text size="pequeno" tone="muted">{externalCalendarEvents.length} compromisso{externalCalendarEvents.length === 1 ? "" : "s"} externo{externalCalendarEvents.length === 1 ? "" : "s"} sincronizado{externalCalendarEvents.length === 1 ? "" : "s"} de Google, Outlook ou Apple.</Text>
      </Surface>
      </div>
    </ActionModal>
    {!embedded && <ActionModal open={itemModalOpen} onOpenChange={(open) => { setItemModalClosing(!open); setItemModalOpen(open); if (!open) setEditingItemId(null); }} onOpenChangeComplete={(open) => { if (!open) setItemModalClosing(false); }} title={editingItemId ? "Editar item" : "Adicionar produto"} confirmLabel={editingItemId ? "Salvar" : "Adicionar"} errorText="Não foi possível salvar o item. Tente de novo." onConfirm={saveItem}>{itemEditorContent}</ActionModal>}
    <ActionModal open={lossModalOpen} onOpenChange={setLossModalOpen} title="Marcar negócio como perdido" confirmLabel="Confirmar perda" errorText="Informe o motivo da perda." onConfirm={async () => { if (!lossReason.trim()) throw new Error("MISSING_REASON"); await closeDeal("lost", lossReason); setLossReason(""); }}>
      <Field><Label>Motivo da perda</Label><Textarea value={lossReason} onChange={(event) => setLossReason(event.target.value)} placeholder="O que impediu o fechamento?" /></Field>
    </ActionModal>

    <Panel open={historyOpen} onOpenChange={setHistoryOpen}>
      <PanelContent side="right" title="Histórico completo" description={`${events.length} ${events.length === 1 ? "evento registrado" : "eventos registrados"}`} closeLabel="Fechar histórico">
        <Timeline collapseChanges items={timelineItems} initialCount={10} pageSize={10} density="compact" groupByDay emptyText="Nenhuma alteração registrada." />
      </PanelContent>
    </Panel>

  </PageFrame>;
}

function capitalize(text: string): string { return text.charAt(0).toLocaleUpperCase("pt-BR") + text.slice(1); }
function statusLabel(status: DealStatus): string { return status === "open" ? "Em aberto" : status === "won" ? "Ganho" : "Perdido"; }
function activityTypeLabel(type: ActivityType): string { return ACTIVITY_TYPE_LABELS[type]; }
function conversationChannelLabel(channel: string): string { return ({ manual: "Interno", email: "E-mail", instagram: "Instagram", whatsapp: "WhatsApp", messenger: "Messenger" } as Record<string, string>)[channel] ?? channel; }
function formatDate(value: string): string { return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(value)); }
function formatDateTime(value: string): string { return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)); }
function formatStageSince(value: string): string {
  const date = new Date(value);
  return `Desde ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(date)} · ${new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(date)}`;
}
function formatStagePeriod(startValue: string, endValue: string): string {
  const start = new Date(startValue);
  const end = new Date(endValue);
  const date = (value: Date) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(value);
  const time = (value: Date) => new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(value);
  return isSameLocalDay(start, end) ? `${date(start)} · ${time(start)}–${time(end)}` : `${date(start)} · ${time(start)} → ${date(end)} · ${time(end)}`;
}
function transitionDescription(fromId: string, toId: string, stages: readonly { id: string; name: string }[]) {
  const fromIndex = stages.findIndex((stage) => stage.id === fromId);
  const toIndex = stages.findIndex((stage) => stage.id === toId);
  const direction = toIndex >= fromIndex ? "forward" as const : "backward" as const;
  const fromName = stages.find((stage) => stage.id === fromId)?.name ?? "outra etapa";
  const toName = stages.find((stage) => stage.id === toId)?.name ?? "outra etapa";
  return { direction, label: `${direction === "forward" ? "Avançou" : "Voltou"} de ${fromName} para ${toName}` };
}

function useCompactStageViewport(): boolean {
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 760px)");
    const update = () => setCompact(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return compact;
}
function isSameLocalDay(left: Date, right: Date): boolean { return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate(); }
function formatTimeRange(startsAt: string, durationMinutes: number): string {
  const start = new Date(startsAt);
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  const format = (date: Date) => new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(date);
  return durationMinutes > 0 ? `${format(start)}–${format(end)}` : format(start);
}

function toLocalDateTimeParts(value: string | Date): { date: string; time: string } {
  const date = new Date(value);
  const part = (number: number) => String(number).padStart(2, "0");
  return { date: `${date.getFullYear()}-${part(date.getMonth() + 1)}-${part(date.getDate())}`, time: `${part(date.getHours())}:${part(date.getMinutes())}` };
}

function nextHalfHour(): Date {
  const date = new Date();
  date.setSeconds(0, 0);
  date.setMinutes(date.getMinutes() < 30 ? 30 : 60);
  return date;
}

function defaultDurationFor(type: ActivityType): number { return type === "deadline" ? 0 : type === "lunch" ? 60 : 30; }
function formatDuration(minutes: number): string {
  if (minutes <= 0) return "Sem duração";
  const hours = Math.floor(minutes / 60); const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}
