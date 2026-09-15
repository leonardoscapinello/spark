import { useEffect, useMemo, useState } from "react";
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
import { optimisticActivity, syncedAmount, optimisticDealProduct, itemForInsert, optimisticNote, writeAccepted } from "@spark/data";
import { Accordion, ActionModal, Modal, ModalContent, PercentInput, Avatar, BackLink, Badge, Button, Composer, ComposerPrompt, DatePicker, TimePicker, Field, Icon, InlineEdit, InlineField, Input, Label, MenuButton, MenuGroup, MenuItem, MoneyInput, PageFrame, PageHeader, SearchSelect, SegmentedControl, Select, Skeleton, StagePassageHistory, StageProgress, Tabs, Textarea, Timeline, notify, type IconName } from "@spark/ui-web";
import type { Route } from "./+types/deal-detail";
import { getActivitiesCollection } from "../lib/activities-collection.client";
import { getCustomFieldsCollection } from "../lib/custom-fields-collection.client";
import { getCustomFieldOptionsCollection, getCustomFieldValuesCollection } from "../lib/custom-field-data.client";
import { useCustomFieldOptions, useCustomFieldValues } from "../lib/custom-fields.client";
import { getDealProductsCollection } from "../lib/deal-products-collection.client";
import { getStageFieldRulesCollection } from "../lib/stage-field-rules-collection.client";
import { getNotesCollection } from "../lib/notes-collection.client";
import { getProductsCollection } from "../lib/catalog-collections.client";
import { getContactsCollection } from "../lib/contacts-collection.client";
import { getDetailDealsCollection, getPipelinesCollection, getStagesCollection } from "../lib/deals-collections.client";
import { getUsersCollection } from "../lib/users-collection.client";
import { getCalendarEventsCollection } from "../lib/calendar-events-collection.client";
import { getSession } from "../lib/auth.client";
import { getCompaniesCollection } from "../lib/companies-collection.client";
import { getEventsCollection } from "../lib/events-collection.client";
import { getConversationsCollection } from "../lib/inbox-collections.client";
import { toTimelineItem } from "../lib/event-presentation";
import { requireCapability } from "../lib/route-access.client";
import { PreviewedCustomFieldValue } from "../lib/link-previews.client";
import { useDealPresence } from "../lib/deal-presence.client";
import { ViewerStack, RecordSelect } from "@spark/ui-web";
import { ContactProfile } from "./contact-detail";
import { CompanyProfile } from "./company-detail";
import styles from "./deal-detail.module.css";

const ACTIVITY_TYPE_OPTIONS = ACTIVITY_TYPES.map((value) => ({ value, label: ACTIVITY_TYPE_LABELS[value] }));
const ACTIVITY_COMPOSER_TABS: readonly { id: ActivityType | "note"; label: string; icon: IconName }[] = [
  { id: "call", label: "Ligação", icon: "phone" },
  { id: "meeting", label: "Reunião", icon: "team" },
  { id: "task", label: "Tarefa", icon: "check" },
  { id: "deadline", label: "Prazo", icon: "pushpin" },
  { id: "email", label: "E-mail", icon: "mail" },
  { id: "lunch", label: "Almoço", icon: "calendar" },
  { id: "note", label: "Nota", icon: "file" },
];
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
    getStageFieldRulesCollection().preload(),
    getCustomFieldValuesCollection().preload(),
    getCustomFieldOptionsCollection().preload(),
    getNotesCollection().preload(),
    getEventsCollection().preload(),
    ...(session.capabilities.includes("contacts:read") ? [getContactsCollection().preload()] : []),
    ...(session.capabilities.includes("activities:read") ? [getActivitiesCollection().preload()] : []),
    ...(session.capabilities.includes("activities:read") ? [getCalendarEventsCollection().preload()] : []),
    ...(session.capabilities.includes("companies:read") ? [getCompaniesCollection().preload()] : []),
  ]);
  return null;
}

function activityOwnerOption(users: User[], ownerId: string) {
  const owner = users.find((user) => user.id === ownerId);
  return owner ? { value: owner.id, label: owner.name, description: owner.email, avatar: owner.avatarUrl } : null;
}

function ExternalScheduleItem({ event, conflict }: { event: CalendarEvent; conflict: boolean }) {
  const provider = { google_calendar: "Google", outlook_calendar: "Outlook", apple_calendar: "Apple" }[event.provider];
  return <div className={styles.scheduleItem} data-conflict={conflict || undefined}>
    <time>{formatExternalTimeRange(event.startsAt, event.endsAt, event.allDay)}</time>
    <div><strong>{event.title}</strong><span>{event.calendarName} · {provider}</span></div>
  </div>;
}

function formatExternalTimeRange(startsAt: string, endsAt: string, allDay: boolean): string {
  if (allDay) return "Dia todo";
  const formatter = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `${formatter.format(new Date(startsAt))}–${formatter.format(new Date(endsAt))}`;
}

export default function DealDetail({ params }: Route.ComponentProps) {
  const dealsCollection = getDetailDealsCollection(dealIdFactory.from(params.dealId));
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [openSections, setOpenSections] = useState<string[]>(["resumo", "detalhes"]);
  const stagesCollection = getStagesCollection();
  const pipelinesCollection = getPipelinesCollection();
  const contactsCollection = getContactsCollection();
  const usersCollection = getUsersCollection();
  const activitiesCollection = getActivitiesCollection();
  const itemsCollection = getDealProductsCollection();
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
  const { data: catalog = [], isLoading: catalogLoading } = useLiveQuery({ query: (q) => canReadCatalog && itemModalOpen ? q.from({ products: getProductsCollection() }).orderBy(({ products: product }) => product.name, "asc") : undefined }, [canReadCatalog, itemModalOpen]);
  const { data: dealNotes = [] } = useLiveQuery({ query: (q) => q.from({ notes: getNotesCollection() }).where(({ notes: note }) => eq(note.dealId, params.dealId)).orderBy(({ notes: note }) => note.createdAt, "desc") });
  const { data: fieldRules = [] } = useLiveQuery({ query: (q) => q.from({ rules: getStageFieldRulesCollection() }) });
  const { data: customFields = [] } = useLiveQuery({ query: (q) => q.from({ fields: getCustomFieldsCollection() }).where(({ fields: field }) => eq(field.entityType, "deal")).orderBy(({ fields: field }) => field.label, "asc") });
  const { data: events } = useLiveQuery({ query: (q) => q.from({ events: getEventsCollection() }).where(({ events: item }) => eq(item.dealId, params.dealId)).orderBy(({ events: item }) => item.occurredAt, "desc") });
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
  const [composerTab, setComposerTab] = useState<ActivityType | "note">("call");
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
  const linkedCompany = deal?.companyId ? companies.find((item) => item.id === deal.companyId) : undefined;
  const contactOptions = useMemo(() => contacts.filter((item) => !item.deletedAt).map((item) => ({ value: item.id, label: item.name, description: [item.email, item.phone].filter(Boolean).join(" · "), avatar: null })), [contacts]);
  const companyOptions = useMemo(() => companies.filter((item) => !item.deletedAt).map((item) => ({ value: item.id, label: item.name, description: [item.taxId, item.website ?? item.email ?? item.legalName].filter(Boolean).join(" · "), avatar: null })), [companies]);
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
  const fieldWarnings = useMemo(() => (deal ? evaluateStageFields({ deal: { ...deal, customFields: customValues }, productCount: dealItems.length, rules: fieldRules, stages: pipelineStages }).warnings : []), [deal, dealItems.length, fieldRules, pipelineStages]);

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
  // «Foco» é o que ainda não foi feito, do mais antigo para o mais novo — o que
  // venceu aparece primeiro; «Histórico» guarda o que já foi concluído.
  const focusActivities = useMemo(() => orderedActivities.filter((activity) => !activity.completed), [orderedActivities]);
  const doneActivities = useMemo(() => orderedActivities.filter((activity) => activity.completed).reverse(), [orderedActivities]);
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

  async function saveNote() {
    const body = noteDraft.trim();
    if (!deal || !session || !body || savingNote) return;
    setSavingNote(true);
    try {
      const note = optimisticNote({ dealId: dealIdFactory.from(deal.id), contactId: deal.contactId, body }, session.orgId, userIdFactory.from(session.userId));
      await notesCollection.insert(note).isPersisted.promise;
      setNoteDraft("");
      notify({ title: "Nota registrada", tone: "success" });
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

  function openItemModal(item?: DealProduct) {
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
    setItemModalOpen(true);
  }

  /** Escolher um produto do catálogo copia nome e preço — dali em diante o item é do negócio. */
  function pickCatalogProduct(productId: string | null) {
    setItemProductId(productId ?? "");
    const product = catalog.find((item) => item.id === productId);
    if (product) { setItemName(product.name); setItemUnitAmount(product.price); }
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
  const [ficha, setFicha] = useState<{ tipo: "contato" | "empresa"; id: string } | null>(null);

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
    notify({ title: status === "won" ? "Negócio ganho" : "Negócio perdido", tone: status === "won" ? "success" : "warning" });
  }

  function openActivityModal(activity?: Activity, requestedType: ActivityType = "task") {
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
    return <PageFrame className={styles.page}><BackLink render={<Link to="/deals" />}>Negócios</BackLink>{isLoading ? <div className={styles.loading} role="status" aria-label="Carregando negócio"><Skeleton /><Skeleton /><Skeleton /></div> : <p>Negócio não encontrado.</p>}</PageFrame>;
  }

  return <PageFrame className={styles.page}>
    <PageHeader
      back={<BackLink render={<Link to="/deals" />}>Negócios</BackLink>}
      icon="briefcase"
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
        <div className={styles.headerPeople}>
          {/* Uma identidade única para o responsável. A presença mostra apenas outras pessoas. */}
          <MenuButton variant="ghost" shape="rounded" indicator={false} disabled={!canWrite} className={styles.owner} aria-label={`Responsável: ${owner?.name ?? "não atribuído"}. Trocar`} menu={<MenuGroup label="Responsável pelo negócio">
            {users.filter((item) => !item.deactivatedAt).map((item) => <MenuItem key={item.id} icon={<Avatar name={item.name} src={item.avatarUrl} size="small" />} aria-current={item.id === deal.ownerId ? "true" : undefined} onClick={() => void changeOwner(item.id)}>{item.name}</MenuItem>)}
            {deal.ownerId && <MenuItem icon={<Icon name="close" />} onClick={() => void changeOwner(null)}>Sem responsável</MenuItem>}
          </MenuGroup>}>
            {owner ? <Avatar name={owner.name} src={owner.avatarUrl} size="small" /> : <Icon name="account" />}
            <span><small>Responsável</small>{owner?.name ?? "Não atribuído"}</span>
          </MenuButton>
          <ViewerStack viewers={presence.viewers} status={presence.status} {...(session ? { currentUserId: session.userId } : {})} />
        </div>
        <div className={styles.headerOutcome}>
          {isOpen && canMove && <>
            <Button onClick={() => void closeDeal("won").catch(() => notify({ title: "Não foi possível fechar o negócio", tone: "error" }))}>Ganho</Button>
            <Button variant="secondary" className={styles.lostButton} onClick={() => { setLossReason(""); setLossModalOpen(true); }}>Perdido</Button>
          </>}
          {!isOpen && <Badge tone={deal.status === "won" ? "success" : "danger"}>{statusLabel(deal.status)}</Badge>}
          {!isOpen && canMove && <Button variant="secondary" icon={<Icon name="undo" />} loading={reopening} onClick={() => void reopenDeal()}>Reabrir</Button>}
        </div>
      </div>}
    />

    <div className={styles.topo}>
      {pipelineStages.length > 0 && <StageProgress
        stages={pipelineStages.map((item) => ({ id: item.id, label: item.name }))}
        currentId={deal.stageId}
        durations={stageTiming.durations}
        details={stageTiming.details}
        outcome={deal.status === "open" ? undefined : deal.status}
        interaction={compactStageUi ? "modal" : "popover"}
        {...(canMove && isOpen && compactStageUi ? { onSelect: (id: string) => setSelectedStageId(id) } : {})}
        {...(canMove && isOpen && !compactStageUi ? { onMove: (id: string) => moveDeal(id) } : {})}
      />}
      <p className={styles.trilha}><Link to="/deals">{pipeline?.name ?? "Funil"}</Link> <Icon name="chevron" /> {stage?.name ?? "Etapa"}</p>
    </div>

    <div className={styles.contentGrid}>
      <aside className={styles.painel}>
        <Accordion value={openSections} onValueChange={setOpenSections} items={[
          { value: "resumo", title: "Resumo", icon: <Icon name="chart" />, ...(faltando.resumo ? { badge: faltando.resumo } : {}), content: <div className={styles.details}>
            {fieldWarnings.length > 0 && <p className={styles.aviso}><Icon name="bolt" />{stageFieldMessage("important", fieldWarnings.map((issue) => stageFieldLabel(issue.fieldKey, customFields)))}</p>}
            {/* O valor é a soma dos produtos e por isso não se edita aqui: um
              * número solto faria a conta do funil discordar do que foi vendido. */}
            <div className={styles.linha}><span>Valor</span><strong>{formatBRL(dealItems.length > 0 ? itemsSummary.net : syncedAmount(deal.amount))}</strong></div>
            <InlineField label="Nome" value={deal.name} disabled={!canWrite}>
              {(close) => <Input aria-label="Nome do negócio" defaultValue={deal.name} onBlur={(event) => { const next = event.target.value.trim(); close(next && next !== deal.name ? saveField({ name: next }, "Nome") : undefined); }} />}
            </InlineField>
            <InlineField label="Previsão" value={deal.expectedCloseDate ? formatDate(deal.expectedCloseDate) : "Sem previsão"} empty={!deal.expectedCloseDate} disabled={!canWrite}>
              {(close) => <DatePicker label="Previsão de fechamento" value={deal.expectedCloseDate?.slice(0, 10) ?? ""} onValueChange={(next) => close(saveField({ expectedCloseDate: next ? new Date(`${next}T12:00:00`).toISOString() : null }, "Previsão"))} />}
            </InlineField>
            <InlineField label="Responsável" value={owner?.name ?? "Não atribuído"} empty={!owner} disabled={!canWrite}>
              {(close) => <Select label="Responsável pelo negócio" value={deal.ownerId ?? null} placeholder="Não atribuído" options={users.filter((item) => !item.deactivatedAt).map((item) => ({ value: item.id, label: item.name, avatar: item.avatarUrl }))} onValueChange={(next) => close(saveField({ ownerId: next ? userIdFactory.from(next) : null }, "Responsável"))} />}
            </InlineField>
            <InlineField label="Pessoa" value={linkedContact?.name ?? "Sem pessoa"} leading={linkedContact && <Avatar name={linkedContact.name} size="small" />} empty={!linkedContact} disabled={!canWrite || !canReadContacts} {...(linkedContact ? { action: { label: `Abrir ${linkedContact.name}`, icon: "eye" as const, onClick: () => setFicha({ tipo: "contato", id: linkedContact.id }) } } : {})}>
              {(close) => <RecordSelect label="Pessoa do negócio" placeholder="Nome, e-mail ou telefone…" options={contactOptions} loading={contactsLoading} value={linkedContact ? { value: linkedContact.id, label: linkedContact.name } : null} onCancel={close} emptyOptionLabel="Sem pessoa vinculada" onValueChange={(next) => close((next?.value ?? null) === deal.contactId ? undefined : saveField({ contactId: next ? contactIdFactory.from(next.value) : null }, "Pessoa"))} />}
            </InlineField>
            <InlineField label="Empresa" value={linkedCompany?.name ?? "Sem empresa"} leading={linkedCompany && <Avatar name={linkedCompany.name} size="small" />} empty={!linkedCompany} disabled={!canWrite || !canReadCompanies} {...(linkedCompany ? { action: { label: `Abrir ${linkedCompany.name}`, icon: "eye" as const, onClick: () => setFicha({ tipo: "empresa", id: linkedCompany.id }) } } : {})}>
              {(close) => <RecordSelect label="Empresa do negócio" kind="company" placeholder="Nome, documento ou site…" options={companyOptions} loading={companiesLoading} value={linkedCompany ? { value: linkedCompany.id, label: linkedCompany.name } : null} onCancel={close} emptyOptionLabel="Sem empresa vinculada" onValueChange={(next) => close((next?.value ?? null) === deal.companyId ? undefined : saveField({ companyId: next ? companyIdFactory.from(next.value) : null }, "Empresa"))} />}
            </InlineField>
            {deal.status === "lost" && <div className={styles.linha}><span>Motivo da perda</span><strong>{deal.lossReason ?? "Não informado"}</strong></div>}
          </div> },
          { value: "detalhes", title: "Detalhes", icon: <Icon name="file" />, ...(faltando.detalhes ? { badge: faltando.detalhes } : {}), content: <div className={styles.details}>
            {customFields.filter((field) => !field.archivedAt).map((field) => <PreviewedCustomFieldValue
              options={fieldOptions.get(field.id) ?? []}
              key={field.id}
              field={field}
              value={customValues[field.key]}
              disabled={!canWrite}
              onSave={(value) => writeAccepted((metadata) => dealsCollection.update(deal.id, { metadata }, (draft) => { draft.customFields = { ...draft.customFields, [field.key]: value }; }))}
              onError={(message) => notify({ title: "Valor inválido", description: message, tone: "error" })}
            />)}
            {customFields.filter((field) => !field.archivedAt).length === 0 && <p className={styles.empty}>Nenhum campo personalizado de negócio. Crie em Configurações · Dados.</p>}
          </div> },
          { value: "produtos", title: "Produtos", icon: <Icon name="briefcase" />, content: <div className={styles.itens}>
            {dealItems.length === 0
              ? <p className={styles.empty}>O valor do negócio é a soma dos produtos. Adicione o que está sendo vendido.</p>
              : <>
                  <ul className={styles.itemList}>{dealItems.map((item) => {
                    const totals = dealProductTotals({ ...item, unitAmount: syncedAmount(item.unitAmount) });
                    return <li key={item.id}>
                      <div className={styles.itemCorpo}>
                        <strong>{item.name}</strong>
                        <span>{formatQuantity(item.quantityMilli)} × {formatBRL(syncedAmount(item.unitAmount))}{item.discountBasisPoints > 0 ? ` · −${formatBasisPoints(item.discountBasisPoints)}%` : ""}{item.taxBasisPoints > 0 ? ` · +${formatBasisPoints(item.taxBasisPoints)}% imp.` : ""}</span>
                      </div>
                      <div className={styles.itemValor}>
                        <strong>{formatBRL(totals.net)}</strong>
                        {canWrite && <span className={styles.activityActions}>
                          <Button size="sm" variant="ghost" iconOnly icon={<Icon name="file" />} aria-label={`Editar ${item.name}`} onClick={() => openItemModal(item)} />
                          <Button size="sm" variant="ghost" iconOnly icon={<Icon name="trash" />} aria-label={`Remover ${item.name}`} onClick={() => void removeItem(item)} />
                        </span>}
                      </div>
                    </li>;
                  })}</ul>
                  <dl className={styles.itemResumo}>
                    <div><dt>Subtotal</dt><dd>{formatBRL(itemsSummary.gross)}</dd></div>
                    {toCents(itemsSummary.discount) > 0 && <div><dt>Descontos</dt><dd>−{formatBRL(itemsSummary.discount)}</dd></div>}
                    {toCents(itemsSummary.tax) > 0 && <div><dt>Impostos</dt><dd>+{formatBRL(itemsSummary.tax)}</dd></div>}
                    <div data-total="true"><dt>Valor do negócio</dt><dd>{formatBRL(itemsSummary.net)}</dd></div>
                  </dl>
                </>}
            {canWrite && <Button size="sm" variant="secondary" icon={<Icon name="plus" />} onClick={() => openItemModal()}>Adicionar produto</Button>}
          </div> },
          /* Pessoa e Empresa não têm seção própria: o resumo já mostra as duas,
           * e o botão ao lado abre a ficha inteira por cima. Repetir o nome
           * numa seção logo abaixo era ocupar o painel com o que já estava à
           * vista três linhas acima. */
          ...(canReadInbox ? [{ value: "conversas", title: "Conversas", icon: <Icon name="message" />, content: !deal.contactId
            ? <p className={styles.empty}>Vincule uma pessoa para ver o atendimento.</p>
            : conversationsLoading ? <Skeleton />
            : conversations.length === 0
              ? <p className={styles.empty}>Nenhuma conversa desta pessoa ainda.</p>
              : <ul className={styles.conversationList}>{conversations.map((conversation) => <li key={conversation.id}><Link to={`/inbox?conversation=${conversation.id}`}><div className={styles.conversationBody}><strong>{conversation.subject}</strong><span>{conversationChannelLabel(conversation.channel)} · {formatDateTime(conversation.lastMessageAt)}</span></div><Icon name="chevron" /></Link></li>)}</ul> }] : []),
        ]} />
      </aside>

      <section className={styles.fluxo}>
        <Composer
          label="Registrar no negócio"
          value={composerTab}
          onValueChange={setComposerTab}
          tabs={ACTIVITY_COMPOSER_TABS.map((tab) => ({ ...tab, disabled: tab.id !== "note" && !canWriteActivities }))}
        >
          {composerTab !== "note"
            ? <ComposerPrompt disabled={!canWriteActivities} onClick={() => openActivityModal(undefined, composerTab)}>
                {canWriteActivities ? `Clique aqui para agendar ${ACTIVITY_TYPE_LABELS[composerTab].toLocaleLowerCase("pt-BR")}…` : "Você não pode agendar atividades."}
              </ComposerPrompt>
            : <div className={styles.compositorNota}>
                <Textarea aria-label="Nova nota" rows={noteDraft ? 4 : 2} value={noteDraft} placeholder="Clique aqui para escrever uma nota…" onChange={(event) => setNoteDraft(event.target.value)} />
                {noteDraft.trim() && <div className={styles.compositorAcoes}>
                  <Button size="sm" loading={savingNote} onClick={() => void saveNote()}>Salvar nota</Button>
                  <Button size="sm" variant="ghost" onClick={() => setNoteDraft("")}>Cancelar</Button>
                </div>}
              </div>}
        </Composer>

        {canReadActivities && <section className={styles.bloco} aria-labelledby="deal-foco">
          <header className={styles.blocoCabecalho}>
            <h2 id="deal-foco" className={styles.blocoTitulo}>Foco</h2>
            <span className={styles.blocoContagem}>{focusActivities.length === 0 ? "nada pendente" : `${focusActivities.length} ${focusActivities.length === 1 ? "pendente" : "pendentes"}`}</span>
          </header>
          <div className={styles.blocoCorpo}>{focusActivities.length === 0
            ? <p className={styles.empty}>Nenhum próximo passo agendado.</p>
            : <ul className={styles.activityList}>{focusActivities.map((activity) => <li key={activity.id} data-completed="false" data-overdue={activity.scheduledAt < new Date().toISOString() ? "true" : undefined}>
                <div><span className={styles.activityType}>{activityTypeLabel(activity.type)}</span><strong>{activity.title}</strong>{activity.description && <p>{activity.description}</p>}<time data-overdue={activity.scheduledAt < new Date().toISOString() ? "true" : undefined}>{activity.scheduledAt < new Date().toISOString() ? "Atrasada · " : ""}{formatDateTime(activity.scheduledAt)}</time></div>
                {canWriteActivities && <span className={styles.activityActions}>
                  <Button size="sm" variant="ghost" onClick={() => openActivityModal(activity)}>Editar</Button>
                  <Button size="sm" variant="secondary" loading={busyActivityId === activity.id} onClick={() => void toggleActivity(activity)}>Concluir</Button>
                </span>}
              </li>)}</ul>}</div>
        </section>}

        <section className={styles.bloco} aria-labelledby="deal-historico">
          <header className={styles.blocoCabecalho}>
            <h2 id="deal-historico" className={styles.blocoTitulo}>Histórico</h2>
            <span className={styles.blocoContagem}>{events.length} {events.length === 1 ? "registro" : "registros"}</span>
          </header>
          <div className={styles.blocoCorpo}><Tabs label="Filtrar o histórico" defaultValue="tudo" items={[
            { value: "tudo", label: "Tudo", content: <>
              {dealNotes.length > 0 && <ul className={styles.notaList}>{dealNotes.slice(0, 3).map((note) => <li key={note.id}><NoteCard note={note} authorName={users.find((user) => user.id === note.authorId)?.name} onRemove={note.authorId === session?.userId ? () => void removeNote(note) : undefined} /></li>)}</ul>}
              <Timeline items={events.map(toTimelineItem)} emptyText="As próximas alterações deste negócio aparecerão aqui." />
            </> },
            { value: "notas", label: `Notas (${dealNotes.length})`, content: dealNotes.length === 0
              ? <p className={styles.empty}>Nenhuma nota ainda. Use o campo acima para registrar o que foi conversado.</p>
              : <ul className={styles.notaList}>{dealNotes.map((note) => <li key={note.id}><NoteCard note={note} authorName={users.find((user) => user.id === note.authorId)?.name} onRemove={note.authorId === session?.userId ? () => void removeNote(note) : undefined} /></li>)}</ul> },
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
        <div className={styles.stageReviewSummary}>
          <Icon name={selectedStageId === deal.stageId ? "calendar" : "right"} />
          <div><strong>{selectedStageId === deal.stageId ? "Tempo nesta passagem" : `Mover de ${stage?.name ?? "etapa atual"}`}</strong><span>{selectedStageDetails?.duration ?? "Ainda sem tempo registrado"}</span>{selectedStageDetails?.totalDuration && selectedStageDetails.totalDuration !== selectedStageDetails.duration && <small>Acumulado nesta etapa: {selectedStageDetails.totalDuration}</small>}</div>
        </div>
        {selectedStageDetails?.period && <p>{selectedStageDetails.period}</p>}
        {selectedStageDetails?.passages?.length ? <StagePassageHistory passages={selectedStageDetails.passages} /> : null}
        {selectedStageId !== deal.stageId && selectedStageCheck && selectedStageCheck.blocking.length > 0 && <p className={styles.aviso}><Icon name="bolt" />{stageFieldMessage("required", selectedStageCheck.blocking.map((issue) => stageFieldLabel(issue.fieldKey, customFields)), selectedStage?.name)}</p>}
        {selectedStageId !== deal.stageId && (!selectedStageCheck || selectedStageCheck.blocking.length === 0) && <p>A alteração será salva imediatamente e registrada no histórico do negócio.</p>}
      </div>
    </ActionModal>

    <ActionModal open={activityModalOpen} onOpenChange={(open) => { setActivityModalOpen(open); if (!open) setEditingActivityId(null); }} title={editingActivityId ? "Editar atividade" : "Nova atividade"} confirmLabel={editingActivityId ? "Salvar" : "Agendar"} errorText="Não foi possível salvar a atividade." onConfirm={saveActivity} size="workspace">
      <div className={styles.activityModalLayout}>
      <div className={styles.modalFields}>
        <SegmentedControl label="Tipo de atividade" value={activityType} options={ACTIVITY_TYPE_OPTIONS} onValueChange={changeActivityType} />
        <p className={styles.activityHint}>{ACTIVITY_FORM_HINTS[activityType]}</p>
        <Field><Label>Título</Label><Input autoFocus value={activityTitle} onChange={(event) => setActivityTitle(event.target.value)} placeholder="Qual é o próximo passo?" /></Field>
        <section className={styles.activityTiming} aria-label="Data, hora e duração">
          <header><strong>Data e hora</strong><Badge tone="neutral">{formatDuration(activityDuration)}</Badge></header>
          <div className={styles.activityInterval}>
          <Field><Label>Data de início</Label><DatePicker label="Data de início" value={activityStartDate} onValueChange={(value) => changeActivityStart(value, activityStartTime)} /></Field>
          <Field><Label>Hora de início</Label><TimePicker label="Hora de início" value={activityStartTime} onValueChange={(value) => changeActivityStart(activityStartDate, value)} /></Field>
          <span className={styles.activityIntervalArrow} aria-hidden="true">→</span>
          <Field><Label>Data de fim</Label><DatePicker label="Data de fim" value={activityEndDate} onValueChange={setActivityEndDate} /></Field>
          <Field><Label>Hora de fim</Label><TimePicker label="Hora de fim" value={activityEndTime} onValueChange={setActivityEndTime} /></Field>
          </div>
        </section>
        <div className={styles.modalLinha}>
          <Field><Label>Prioridade</Label><Select label="Prioridade da atividade" value={activityPriority} options={PRIORITIES} onValueChange={(value) => { if (value) setActivityPriority(value as ActivityPriority); }} /></Field>
          {activityType !== "deadline" && activityType !== "task" && activityType !== "email" && <Field><Label>Disponibilidade</Label><Select label="Disponibilidade no calendário" value={activityAvailability} options={AVAILABILITIES} onValueChange={(value) => { if (value) setActivityAvailability(value as ActivityAvailability); }} /></Field>}
        </div>
        <div className={styles.modalLinha}>
          <Field><Label>Responsável</Label><SearchSelect label="Responsável pela atividade" searchPlacement="dropdown" placeholder="Buscar usuário" options={users.filter((item) => !item.deactivatedAt).map((item) => ({ value: item.id, label: item.name, description: item.email, avatar: item.avatarUrl }))} value={activityOwnerOption(users, activityOwnerId)} onValueChange={(option) => setActivityOwnerId(option?.value ?? "")} /></Field>
          {(activityType === "meeting" || activityType === "lunch") && <Field><Label>Local</Label><Input value={activityLocation} onChange={(event) => setActivityLocation(event.target.value)} placeholder="Sala ou endereço" /></Field>}
        </div>
        {activityType === "meeting" && <Field><Label>Link da videochamada</Label><Input type="url" value={activityVideoCallUrl} onChange={(event) => setActivityVideoCallUrl(event.target.value)} placeholder="https://meet.google.com/…" /></Field>}
        <Field><Label>{activityType === "email" ? "Assunto e contexto" : "Descrição para participantes"}</Label><Textarea value={activityDescription} onChange={(event) => setActivityDescription(event.target.value)} placeholder={activityType === "email" ? "O que deve ser tratado no acompanhamento" : "Pauta e informações que podem aparecer no convite do calendário"} /></Field>
        <Field><Label>Nota interna</Label><Textarea value={activityNotes} onChange={(event) => setActivityNotes(event.target.value)} placeholder="Contexto privado, visível apenas para a equipe" /></Field>
        <section className={styles.activityContext} aria-label="Vínculos da atividade">
          <strong>Vínculos</strong>
          <div className={styles.activityContextItems}>
            <span><Icon name="briefcase" />{deal.name}</span>
            {linkedContact && <span><Avatar name={linkedContact.name} size="small" />{linkedContact.name}</span>}
            {linkedCompany && <span><Icon name="building" />{linkedCompany.name}</span>}
          </div>
        </section>
      </div>
      <aside className={styles.daySchedule} aria-label="Agenda do dia selecionado">
        <header>
          <div><strong>{scheduledDate && !Number.isNaN(scheduledDate.getTime()) ? new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long" }).format(scheduledDate) : "Escolha uma data"}</strong><span>Agenda de {users.find((item) => item.id === activityOwnerId)?.name ?? "ninguém"}</span></div>
          <Badge tone={scheduleConflicts.size > 0 ? "danger" : "success"}>{scheduleConflicts.size > 0 ? `${scheduleConflicts.size} conflito${scheduleConflicts.size > 1 ? "s" : ""}` : "Horário livre"}</Badge>
        </header>
        <div className={styles.dayScheduleBody}>
          {scheduledDayActivities.length === 0 && scheduledDayExternal.length === 0
            ? <p className={styles.empty}>Nenhum compromisso neste dia.</p>
            : <>{scheduledDayActivities.map((activity) => <div key={activity.id} className={styles.scheduleItem} data-conflict={scheduleConflicts.has(activity.id) || undefined}>
                <time>{formatTimeRange(activity.scheduledAt, activity.durationMinutes)}</time>
                <div><strong>{activity.title}</strong><span>{activityTypeLabel(activity.type)} · Spark</span></div>
              </div>)}{scheduledDayExternal.map((event) => <ExternalScheduleItem key={event.id} event={event} conflict={scheduleConflicts.has(event.id)} />)}</>}
        </div>
        <footer><Icon name="calendar" /><span>{externalCalendarEvents.length} compromisso{externalCalendarEvents.length === 1 ? "" : "s"} externo{externalCalendarEvents.length === 1 ? "" : "s"} sincronizado{externalCalendarEvents.length === 1 ? "" : "s"} de Google, Outlook ou Apple.</span></footer>
      </aside>
      </div>
    </ActionModal>
    <ActionModal open={itemModalOpen} onOpenChange={(open) => { setItemModalOpen(open); if (!open) setEditingItemId(null); }} title={editingItemId ? "Editar item" : "Adicionar produto"} confirmLabel={editingItemId ? "Salvar" : "Adicionar"} errorText="Não foi possível salvar o item. Tente de novo." onConfirm={saveItem}>
      <div className={styles.modalFields}>
        {canReadCatalog && <Field><Label>Do catálogo</Label><SearchSelect label="Produto do catálogo" searchPlacement="dropdown" placeholder={catalogLoading ? "Carregando catálogo…" : "Escolher um produto cadastrado (opcional)"} options={catalog.filter((item) => item.active).map((item) => ({ value: item.id, label: item.name, description: `${item.sku} · ${formatBRL(item.price)}` }))} value={itemProductId ? { value: itemProductId, label: catalog.find((item) => item.id === itemProductId)?.name ?? itemName } : null} onValueChange={(option) => pickCatalogProduct(option?.value ?? null)} /></Field>}
        <Field><Label>Nome do item</Label><Input value={itemName} onChange={(event) => setItemName(event.target.value)} placeholder="Escreva um item avulso ou escolha do catálogo" /></Field>
        <div className={styles.modalLinha}>
          <Field><Label>Quantidade</Label><Input inputMode="decimal" value={itemQuantity} onChange={(event) => setItemQuantity(event.target.value)} placeholder="1" /></Field>
          <Field><Label>Preço unitário</Label><MoneyInput label="Preço unitário" value={itemUnitAmount} onValueChange={setItemUnitAmount} /></Field>
        </div>
        <div className={styles.modalLinha}>
          <Field><Label>Desconto</Label><PercentInput label="Desconto do item" value={itemDiscount} onValueChange={setItemDiscount} /></Field>
          <Field><Label>Imposto</Label><PercentInput label="Imposto do item" value={itemTax} onValueChange={setItemTax} /></Field>
        </div>
      </div>
    </ActionModal>
    <ActionModal open={lossModalOpen} onOpenChange={setLossModalOpen} title="Marcar negócio como perdido" confirmLabel="Confirmar perda" errorText="Informe o motivo da perda." onConfirm={async () => { if (!lossReason.trim()) throw new Error("MISSING_REASON"); await closeDeal("lost", lossReason); setLossReason(""); }}>
      <Field><Label>Motivo da perda</Label><Textarea value={lossReason} onChange={(event) => setLossReason(event.target.value)} placeholder="O que impediu o fechamento?" /></Field>
    </ActionModal>

    {/* A ficha entra por cima, ocupando 85% da largura: o negócio continua
      * visível atrás, e fechar devolve exatamente onde se estava. */}
    <Modal open={ficha !== null} onOpenChange={(aberta) => { if (!aberta) setFicha(null); }}>
      <ModalContent
        placement="right"
        size="record"
        title={ficha?.tipo === "empresa" ? "Empresa" : "Pessoa"}
        closeLabel="Fechar e voltar ao negócio"
      >
        {ficha?.tipo === "contato" && <ContactProfile contactId={ficha.id} embedded />}
        {ficha?.tipo === "empresa" && <CompanyProfile companyId={ficha.id} embedded />}
      </ModalContent>
    </Modal>
  </PageFrame>;
}

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

/** Nota no histórico: papel amarelo, como o do Pipedrive — fala de gente, não registro do sistema. */
function NoteCard({ note, authorName, onRemove }: { note: Note; authorName?: string | undefined; onRemove?: (() => void) | undefined }) {
  return <article className={styles.nota}>
    <header><strong>{authorName ?? "Alguém"}</strong><time>{formatDateTime(note.createdAt)}</time>{onRemove && <Button size="sm" variant="ghost" iconOnly icon={<Icon name="trash" />} aria-label="Remover nota" onClick={onRemove} />}</header>
    <p>{note.body}</p>
  </article>;
}
