import { useMemo, useState } from "react";
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
  ACTIVITY_TYPES,
  ACTIVITY_TYPE_LABELS,
  dealProductTotals,
  dealProductsSummary,
  formatQuantity,
  parseQuantity,
  formatBasisPoints,
  productId as productIdFactory,
  type DealProduct,
  millisecondsByStage,
  stageVisits,
  formatStageDuration,
  evaluateStageFields,
  stageFieldLabel,
  stageFieldMessage,
  stageFieldGaps,
  type Note,
  type Deal,
} from "@spark/core";
import { optimisticActivity, syncedAmount, optimisticDealProduct, itemForInsert, optimisticNote, writeAccepted } from "@spark/data";
import { Accordion, ActionModal, Modal, ModalContent, PercentInput, Avatar, BackLink, Badge, Button, Composer, ComposerPrompt, DatePicker, DateTimePicker, Field, Icon, InlineField, Input, Label, MenuButton, MenuGroup, MenuItem, MoneyInput, PageFrame, PageHeader, SearchSelect, SegmentedControl, Select, Skeleton, StageProgress, Tabs, Textarea, Timeline, notify } from "@spark/ui-web";
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
import { getSession } from "../lib/auth.client";
import { getCompaniesCollection } from "../lib/companies-collection.client";
import { getEventsCollection } from "../lib/events-collection.client";
import { getConversationsCollection } from "../lib/inbox-collections.client";
import { toTimelineItem } from "../lib/event-presentation";
import { requireCapability } from "../lib/route-access.client";
import { PreviewedCustomFieldValue } from "../lib/link-previews.client";
import { ContactProfile } from "./contact-detail";
import { CompanyProfile } from "./company-detail";
import styles from "./deal-detail.module.css";

const ACTIVITY_TYPE_OPTIONS = ACTIVITY_TYPES.map((value) => ({ value, label: ACTIVITY_TYPE_LABELS[value] }));
/* Durações que o Pipedrive oferece por padrão — quem precisa de outra escreve. */
const DURATIONS = [{ value: "0", label: "Sem duração" }, { value: "15", label: "15 min" }, { value: "30", label: "30 min" }, { value: "60", label: "1 hora" }, { value: "90", label: "1h30" }, { value: "120", label: "2 horas" }];

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
    ...(session.capabilities.includes("companies:read") ? [getCompaniesCollection().preload()] : []),
  ]);
  return null;
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
  const { data: stages } = useLiveQuery({ query: (q) => q.from({ stages: stagesCollection }).orderBy(({ stages: item }) => item.sortOrder, "asc") });
  const { data: pipelines } = useLiveQuery({ query: (q) => q.from({ pipelines: pipelinesCollection }) });
  const { data: contacts = [] } = useLiveQuery({ query: (q) => canReadContacts ? q.from({ contacts: contactsCollection }).orderBy(({ contacts: item }) => item.name, "asc") : undefined });
  const { data: users } = useLiveQuery({ query: (q) => q.from({ users: usersCollection }).orderBy(({ users: item }) => item.name, "asc") });
  const { data: companies = [] } = useLiveQuery({ query: (q) => canReadCompanies ? q.from({ companies: companiesCollection }).orderBy(({ companies: item }) => item.name, "asc") : undefined });
  const { data: activities = [] } = useLiveQuery({
    query: (q) => canReadActivities ? q.from({ activities: activitiesCollection }).where(({ activities: item }) => eq(item.dealId, params.dealId)).orderBy(({ activities: item }) => item.scheduledAt, "asc") : undefined,
  });
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
  const [activityNotes, setActivityNotes] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [activityDuration, setActivityDuration] = useState("30");
  const [activityLocation, setActivityLocation] = useState("");
  const [activityOwnerId, setActivityOwnerId] = useState("");
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
  const [composerTab, setComposerTab] = useState<"atividade" | "nota">("atividade");
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

  const pipelineStages = deal ? stages.filter((stage) => stage.pipelineId === deal.pipelineId) : [];
  const pipeline = deal ? pipelines.find((item) => item.id === deal.pipelineId) : undefined;
  const stage = deal ? stages.find((item) => item.id === deal.stageId) : undefined;
  const linkedContact = deal?.contactId ? contacts.find((item) => item.id === deal.contactId) : undefined;
  const owner = deal?.ownerId ? users.find((item) => item.id === deal.ownerId) : undefined;
  const linkedCompany = deal?.companyId ? companies.find((item) => item.id === deal.companyId) : undefined;
  const orderedActivities = useMemo(() => [...activities].sort((left, right) => Number(left.completed) - Number(right.completed) || left.scheduledAt.localeCompare(right.scheduledAt)), [activities]);
  // Valores vindos das colunas tipadas, não do jsonb (ADR-0035).
  const customValues = useCustomFieldValues("deal", params.dealId, customFields);
  const fieldOptions = useCustomFieldOptions();
  const isOpen = deal?.status === "open";
  /* Tempo em cada etapa, reconstruído do histórico (packages/core/rules/stageDuration) —
   * sem coluna nova: os eventos de mudança já contam essa história. */
  const stageDurations = useMemo(() => {
    if (!deal) return {};
    const changes = events
      .filter((event) => event.type === "deal.stage_changed")
      .map((event) => ({ stageId: String((event.data as { stageId?: string } | null)?.stageId ?? ""), occurredAt: event.occurredAt }))
      .filter((change) => change.stageId);
    const firstStage = changes.length > 0 ? pipelineStages[0]?.id ?? deal.stageId : deal.stageId;
    const totals = millisecondsByStage(stageVisits(deal.createdAt, firstStage, changes, new Date()), new Date());
    return Object.fromEntries([...totals].map(([stageId, ms]) => [stageId, formatStageDuration(ms)]));
  }, [deal, events, pipelineStages]);
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
    try {
      await writeAccepted((metadata) => dealsCollection.update(deal.id, { metadata }, (draft) => { draft.status = "open"; draft.lossReason = null; }));
      notify({ title: "Negócio reaberto", tone: "success" });
    } catch {
      notify({ title: "Não foi possível reabrir o negócio", tone: "error" });
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
      notify({
        title: "Faltam campos obrigatórios",
        description: stageFieldMessage("required", check.blocking.map((issue) => stageFieldLabel(issue.fieldKey, customFields)), pipelineStages.find((item) => item.id === value)?.name),
        tone: "warning",
      });
      return;
    }
    try {
      await writeAccepted((metadata) => dealsCollection.update(deal.id, { metadata }, (draft) => { draft.stageId = stageIdFactory.from(value); }));
      notify({ title: "Etapa atualizada", tone: "success" });
    } catch {
      notify({ title: "Não foi possível mudar a etapa", tone: "error" });
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

  function openActivityModal(activity?: Activity) {
    if (activity) {
      setEditingActivityId(activity.id);
      setActivityType(activity.type);
      setActivityTitle(activity.title);
      setActivityNotes(activity.notes ?? "");
      setScheduledAt(activity.scheduledAt.slice(0, 16));
      setActivityDuration(String(activity.durationMinutes));
      setActivityLocation(activity.location ?? "");
      setActivityOwnerId(activity.ownerId ?? "");
    } else {
      setEditingActivityId(null);
      setActivityTitle(""); setActivityNotes(""); setScheduledAt(""); setActivityType("task");
      setActivityDuration("30"); setActivityLocation(""); setActivityOwnerId(deal?.ownerId ?? session?.userId ?? "");
    }
    setActivityModalOpen(true);
  }

  async function saveActivity() {
    if (!deal || !session || !activityTitle.trim() || !scheduledAt) throw new Error("MISSING_FIELDS");
    const fields = {
      type: activityType,
      title: activityTitle.trim(),
      notes: activityNotes.trim() || null,
      scheduledAt: new Date(scheduledAt).toISOString(),
      durationMinutes: Number(activityDuration),
      location: activityLocation.trim() || null,
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
      title={deal.name}
      actions={<>
        {/* Trocar o responsável é um clique no próprio nome — sem abrir o formulário de edição. */}
        <MenuButton variant="ghost" shape="rounded" indicator={false} disabled={!canWrite} className={styles.owner} aria-label={`Responsável: ${owner?.name ?? "não atribuído"}. Trocar`} menu={<MenuGroup label="Responsável pelo negócio">
          {users.filter((item) => !item.deactivatedAt).map((item) => <MenuItem key={item.id} icon={<Avatar name={item.name} size="small" />} aria-current={item.id === deal.ownerId ? "true" : undefined} onClick={() => void changeOwner(item.id)}>{item.name}</MenuItem>)}
          {deal.ownerId && <MenuItem icon={<Icon name="close" />} onClick={() => void changeOwner(null)}>Sem responsável</MenuItem>}
        </MenuGroup>}>
          {owner ? <Avatar name={owner.name} size="small" /> : <Icon name="account" />}
          <span><small>Responsável</small>{owner?.name ?? "Não atribuído"}</span>
        </MenuButton>
        {isOpen && canMove && <>
          <Button onClick={() => void closeDeal("won").catch(() => notify({ title: "Não foi possível fechar o negócio", tone: "error" }))}>Ganho</Button>
          <Button variant="secondary" className={styles.lostButton} onClick={() => { setLossReason(""); setLossModalOpen(true); }}>Perdido</Button>
        </>}
        {!isOpen && <Badge tone={deal.status === "won" ? "success" : "danger"}>{statusLabel(deal.status)}</Badge>}
        {canWrite && <MenuButton iconOnly indicator={false} variant="ghost" shape="rounded" icon={<Icon name="more" />} aria-label={`Ações do negócio ${deal.name}`} menu={<>
          {!isOpen && canMove && <MenuItem icon={<Icon name="briefcase" />} onClick={() => void reopenDeal()}>Reabrir negócio</MenuItem>}
        </>} />}
      </>}
    />

    <div className={styles.topo}>
      {pipelineStages.length > 0 && <StageProgress
        stages={pipelineStages.map((item) => ({ id: item.id, label: item.name }))}
        currentId={deal.stageId}
        durations={stageDurations}
        outcome={deal.status === "open" ? undefined : deal.status}
        {...(canMove && isOpen ? { onSelect: (id: string) => void moveDeal(id) } : {})}
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
              {(close) => <Select label="Responsável pelo negócio" value={deal.ownerId ?? null} placeholder="Não atribuído" options={users.filter((item) => !item.deactivatedAt).map((item) => ({ value: item.id, label: item.name }))} onValueChange={(next) => close(saveField({ ownerId: next ? userIdFactory.from(next) : null }, "Responsável"))} />}
            </InlineField>
            <InlineField label="Pessoa" value={linkedContact?.name ?? "Sem pessoa"} empty={!linkedContact} disabled={!canWrite} {...(linkedContact ? { action: { label: `Abrir ${linkedContact.name}`, icon: "eye" as const, onClick: () => setFicha({ tipo: "contato", id: linkedContact.id }) } } : {})}>
              {(close) => <SearchSelect label="Pessoa do negócio" searchPlacement="dropdown" placeholder="Selecionar pessoa" options={contacts.filter((item) => !item.deletedAt).map((item) => ({ value: item.id, label: item.name, ...(item.email ? { description: item.email } : {}) }))} value={linkedContact ? { value: linkedContact.id, label: linkedContact.name } : null} onValueChange={(next) => close(next ? saveField({ contactId: contactIdFactory.from(next.value) }, "Pessoa") : undefined)} />}
            </InlineField>
            <InlineField label="Empresa" value={linkedCompany?.name ?? "Sem empresa"} empty={!linkedCompany} disabled={!canWrite} {...(linkedCompany ? { action: { label: `Abrir ${linkedCompany.name}`, icon: "eye" as const, onClick: () => setFicha({ tipo: "empresa", id: linkedCompany.id }) } } : {})}>
              {(close) => <Select label="Empresa do negócio" value={deal.companyId ?? null} placeholder="Não vinculada" options={companies.filter((item) => !item.deletedAt).map((item) => ({ value: item.id, label: item.name }))} onValueChange={(next) => close(saveField({ companyId: next ? companyIdFactory.from(next) : null }, "Empresa"))} />}
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
          tabs={[{ id: "atividade", label: "Atividade", icon: "calendar", disabled: !canWriteActivities }, { id: "nota", label: "Nota", icon: "file" }]}
        >
          {composerTab === "atividade"
            ? <ComposerPrompt disabled={!canWriteActivities} onClick={() => openActivityModal()}>
                {canWriteActivities ? "Clique aqui para agendar uma atividade…" : "Você não pode agendar atividades."}
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
                <div><span className={styles.activityType}>{activityTypeLabel(activity.type)}</span><strong>{activity.title}</strong>{activity.notes && <p>{activity.notes}</p>}<time data-overdue={activity.scheduledAt < new Date().toISOString() ? "true" : undefined}>{activity.scheduledAt < new Date().toISOString() ? "Atrasada · " : ""}{formatDateTime(activity.scheduledAt)}</time></div>
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

    <ActionModal open={activityModalOpen} onOpenChange={(open) => { setActivityModalOpen(open); if (!open) setEditingActivityId(null); }} title={editingActivityId ? "Editar atividade" : "Nova atividade"} confirmLabel={editingActivityId ? "Salvar" : "Agendar"} errorText="Preencha título, data e hora." onConfirm={saveActivity}>
      <div className={styles.modalFields}>
        <SegmentedControl label="Tipo de atividade" value={activityType} options={ACTIVITY_TYPE_OPTIONS} onValueChange={(value) => setActivityType(value)} />
        <Field><Label>Título</Label><Input autoFocus value={activityTitle} onChange={(event) => setActivityTitle(event.target.value)} placeholder="Qual é o próximo passo?" /></Field>
        <div className={styles.modalLinha}>
          <Field><Label>Data e hora</Label><DateTimePicker label="Data e hora" mode="datetime" value={scheduledAt} onValueChange={setScheduledAt} /></Field>
          <Field><Label>Duração</Label><Select label="Duração da atividade" value={activityDuration} options={DURATIONS} onValueChange={(value) => { if (value) setActivityDuration(value); }} /></Field>
        </div>
        <div className={styles.modalLinha}>
          <Field><Label>Responsável</Label><Select label="Responsável pela atividade" value={activityOwnerId || null} placeholder="Ninguém" options={users.filter((item) => !item.deactivatedAt).map((item) => ({ value: item.id, label: item.name }))} onValueChange={(value) => setActivityOwnerId(value ?? "")} /></Field>
          <Field><Label>Local</Label><Input value={activityLocation} onChange={(event) => setActivityLocation(event.target.value)} placeholder="Sala, endereço ou link da chamada" /></Field>
        </div>
        <Field><Label>Observações</Label><Textarea value={activityNotes} onChange={(event) => setActivityNotes(event.target.value)} placeholder="Contexto para a equipe" /></Field>
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

/** Nota no histórico: papel amarelo, como o do Pipedrive — fala de gente, não registro do sistema. */
function NoteCard({ note, authorName, onRemove }: { note: Note; authorName?: string | undefined; onRemove?: (() => void) | undefined }) {
  return <article className={styles.nota}>
    <header><strong>{authorName ?? "Alguém"}</strong><time>{formatDateTime(note.createdAt)}</time>{onRemove && <Button size="sm" variant="ghost" iconOnly icon={<Icon name="trash" />} aria-label="Remover nota" onClick={onRemove} />}</header>
    <p>{note.body}</p>
  </article>;
}
