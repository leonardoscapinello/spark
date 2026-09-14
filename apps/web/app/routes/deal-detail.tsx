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
  ACTIVITY_TYPES,
  ACTIVITY_TYPE_LABELS,
  dealProductTotals,
  dealProductsSummary,
  formatQuantity,
  parseQuantity,
  formatBasisPoints,
  parseBasisPoints,
  productId as productIdFactory,
  type DealProduct,
  millisecondsByStage,
  stageVisits,
  formatStageDuration,
  evaluateStageFields,
  stageFieldLabel,
} from "@spark/core";
import { optimisticActivity, syncedAmount, optimisticDealProduct, itemForInsert } from "@spark/data";
import { Accordion, ActionModal, Avatar, BackLink, Badge, Button, CustomFieldValue, DatePicker, DateTimePicker, Field, Icon, Input, Label, MenuButton, MenuGroup, MenuItem, MoneyInput, PageFrame, PageHeader, SearchSelect, SegmentedControl, Select, Skeleton, StageProgress, Tabs, Textarea, Timeline, notify, type IconName, type SelectOption } from "@spark/ui-web";
import type { Route } from "./+types/deal-detail";
import { getActivitiesCollection } from "../lib/activities-collection.client";
import { getCustomFieldsCollection } from "../lib/custom-fields-collection.client";
import { getDealProductsCollection } from "../lib/deal-products-collection.client";
import { getStageFieldRulesCollection } from "../lib/stage-field-rules-collection.client";
import { getProductsCollection } from "../lib/catalog-collections.client";
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

const ACTIVITY_TYPE_OPTIONS = ACTIVITY_TYPES.map((value) => ({ value, label: ACTIVITY_TYPE_LABELS[value] }));
const ACTIVITY_TYPE_ICONS: Record<ActivityType, IconName> = { task: "check", call: "phone", meeting: "team", email: "mail", lunch: "calendar", deadline: "bolt" };
/* Durações que o Pipedrive oferece por padrão — quem precisa de outra escreve. */
const DURATIONS = [{ value: "0", label: "Sem duração" }, { value: "15", label: "15 min" }, { value: "30", label: "30 min" }, { value: "60", label: "1 hora" }, { value: "90", label: "1h30" }, { value: "120", label: "2 horas" }];

export async function clientLoader() {
  const session = await requireCapability("deals:read");
  void Promise.allSettled([
    getDealsCollection().preload(),
    getPipelinesCollection().preload(),
    getStagesCollection().preload(),
    getUsersCollection().preload(),
    getDealProductsCollection().preload(),
    getStageFieldRulesCollection().preload(),
    ...(session.capabilities.includes("catalog:read") ? [getProductsCollection().preload()] : []),
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
  const itemsCollection = getDealProductsCollection();
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
  const canReadCatalog = session?.capabilities.includes("catalog:read") ?? false;
  const { data: dealItems = [] } = useLiveQuery({ query: (q) => q.from({ items: getDealProductsCollection() }).where(({ items: item }) => eq(item.dealId, params.dealId)).orderBy(({ items: item }) => item.sortOrder, "asc") });
  const { data: catalog = [] } = useLiveQuery({ query: (q) => canReadCatalog ? q.from({ products: getProductsCollection() }).orderBy(({ products: product }) => product.name, "asc") : undefined });
  const { data: fieldRules = [] } = useLiveQuery({ query: (q) => q.from({ rules: getStageFieldRulesCollection() }) });
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
  const [activityDuration, setActivityDuration] = useState("30");
  const [activityLocation, setActivityLocation] = useState("");
  const [activityOwnerId, setActivityOwnerId] = useState("");
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [itemProductId, setItemProductId] = useState("");
  const [itemName, setItemName] = useState("");
  const [itemQuantity, setItemQuantity] = useState("1");
  const [itemUnitAmount, setItemUnitAmount] = useState<Money | null>(null);
  const [itemDiscount, setItemDiscount] = useState("0");
  const [itemTax, setItemTax] = useState("0");
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
  const fieldWarnings = useMemo(() => (deal ? evaluateStageFields({ deal, productCount: dealItems.length, rules: fieldRules, stages: pipelineStages }).warnings : []), [deal, dealItems.length, fieldRules, pipelineStages]);
  const itemsSummary = useMemo(() => dealProductsSummary(dealItems.map((item) => ({ ...item, unitAmount: syncedAmount(item.unitAmount) }))), [dealItems]);
  // «Foco» é o que ainda não foi feito, do mais antigo para o mais novo — o que
  // venceu aparece primeiro; «Histórico» guarda o que já foi concluído.
  const focusActivities = useMemo(() => orderedActivities.filter((activity) => !activity.completed), [orderedActivities]);
  const doneActivities = useMemo(() => orderedActivities.filter((activity) => activity.completed).reverse(), [orderedActivities]);

  async function changeOwner(nextOwnerId: string | null) {
    if (!deal || !canWrite) return;
    try {
      const transaction = dealsCollection.update(deal.id, (draft) => { draft.ownerId = nextOwnerId ? userIdFactory.from(nextOwnerId) : null; });
      await transaction.isPersisted.promise;
      notify({ title: "Responsável atualizado", tone: "success" });
    } catch {
      notify({ title: "Não foi possível trocar o responsável", tone: "error" });
    }
  }

  function openItemModal(item?: DealProduct) {
    if (item) {
      setEditingItemId(item.id);
      setItemProductId(item.productId ?? "");
      setItemName(item.name);
      setItemQuantity(formatQuantity(item.quantityMilli));
      setItemUnitAmount(syncedAmount(item.unitAmount));
      setItemDiscount(formatBasisPoints(item.discountBasisPoints));
      setItemTax(formatBasisPoints(item.taxBasisPoints));
    } else {
      setEditingItemId(null); setItemProductId(""); setItemName(""); setItemQuantity("1"); setItemUnitAmount(null); setItemDiscount("0"); setItemTax("0");
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
    if (!deal || !session) throw new Error("MISSING_FIELDS");
    const quantityMilli = parseQuantity(itemQuantity);
    const discountBasisPoints = parseBasisPoints(itemDiscount);
    const taxBasisPoints = parseBasisPoints(itemTax);
    if (!itemName.trim() || itemUnitAmount === null || quantityMilli === null || discountBasisPoints === null || taxBasisPoints === null) throw new Error("MISSING_FIELDS");
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
    // Obrigatório é obrigatório: a etapa não muda com campo do caminho vazio.
    const check = evaluateStageFields({ deal, productCount: dealItems.length, rules: fieldRules, stages: pipelineStages, targetStageId: value });
    if (check.blocking.length > 0) {
      notify({
        title: "Campos obrigatórios para avançar",
        description: check.blocking.map((issue) => stageFieldLabel(issue.fieldKey, customFields)).join(", "),
        tone: "warning",
      });
      return;
    }
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
          <MenuItem icon={<Icon name="file" />} onClick={beginEditing}>Editar negócio</MenuItem>
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
        <Accordion defaultValue={["resumo", "detalhes"]} items={[
          { value: "resumo", title: "Resumo", icon: <Icon name="chart" />, content: <div className={styles.details}>
            {fieldWarnings.length > 0 && <p className={styles.aviso}><Icon name="bolt" />Preencha para avançar melhor: {fieldWarnings.map((issue) => stageFieldLabel(issue.fieldKey, customFields)).join(", ")}</p>}
            <div><span>Valor</span><strong>{formatBRL(dealItems.length > 0 ? itemsSummary.net : syncedAmount(deal.amount))}</strong></div>
            {dealItems.length > 0 && <div><span>Produtos</span><strong>{dealItems.length}</strong></div>}
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
          <span className={styles.compositorRotulo}>Registrar</span>
          {ACTIVITY_TYPE_OPTIONS.map((option) => <Button key={option.value} size="sm" variant="secondary" shape="rounded" icon={<Icon name={ACTIVITY_TYPE_ICONS[option.value]} />} onClick={() => { openActivityModal(); setActivityType(option.value); }}>{option.label}</Button>)}
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
    <ActionModal open={itemModalOpen} onOpenChange={(open) => { setItemModalOpen(open); if (!open) setEditingItemId(null); }} title={editingItemId ? "Editar item" : "Adicionar produto"} confirmLabel={editingItemId ? "Salvar" : "Adicionar"} errorText="Preencha nome, quantidade e preço — desconto e imposto vão de 0 a 100." onConfirm={saveItem}>
      <div className={styles.modalFields}>
        {canReadCatalog && <Field><Label>Do catálogo</Label><SearchSelect label="Produto do catálogo" searchPlacement="dropdown" placeholder="Escolher um produto cadastrado (opcional)" options={catalog.filter((item) => item.active).map((item) => ({ value: item.id, label: item.name, description: `${item.sku} · ${formatBRL(item.price)}` }))} value={itemProductId ? { value: itemProductId, label: catalog.find((item) => item.id === itemProductId)?.name ?? itemName } : null} onValueChange={(option) => pickCatalogProduct(option?.value ?? null)} /></Field>}
        <Field><Label>Nome do item</Label><Input value={itemName} onChange={(event) => setItemName(event.target.value)} placeholder="Escreva um item avulso ou escolha do catálogo" /></Field>
        <div className={styles.modalLinha}>
          <Field><Label>Quantidade</Label><Input inputMode="decimal" value={itemQuantity} onChange={(event) => setItemQuantity(event.target.value)} placeholder="1" /></Field>
          <Field><Label>Preço unitário</Label><MoneyInput label="Preço unitário" value={itemUnitAmount} onValueChange={setItemUnitAmount} /></Field>
        </div>
        <div className={styles.modalLinha}>
          <Field><Label>Desconto (%)</Label><Input inputMode="decimal" value={itemDiscount} onChange={(event) => setItemDiscount(event.target.value)} placeholder="0" /></Field>
          <Field><Label>Imposto (%)</Label><Input inputMode="decimal" value={itemTax} onChange={(event) => setItemTax(event.target.value)} placeholder="0" /></Field>
        </div>
      </div>
    </ActionModal>
    <ActionModal open={lossModalOpen} onOpenChange={setLossModalOpen} title="Marcar negócio como perdido" confirmLabel="Confirmar perda" errorText="Informe o motivo da perda." onConfirm={async () => { if (!lossReason.trim()) throw new Error("MISSING_REASON"); await closeDeal("lost", lossReason); setLossReason(""); }}>
      <Field><Label>Motivo da perda</Label><Textarea value={lossReason} onChange={(event) => setLossReason(event.target.value)} placeholder="O que impediu o fechamento?" /></Field>
    </ActionModal>
  </PageFrame>;
}

function statusLabel(status: DealStatus): string { return status === "open" ? "Em aberto" : status === "won" ? "Ganho" : "Perdido"; }
function activityTypeLabel(type: ActivityType): string { return ACTIVITY_TYPE_LABELS[type]; }
function conversationChannelLabel(channel: string): string { return ({ manual: "Interno", email: "E-mail", instagram: "Instagram", whatsapp: "WhatsApp", messenger: "Messenger" } as Record<string, string>)[channel] ?? channel; }
function formatDate(value: string): string { return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(value)); }
function formatDateTime(value: string): string { return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)); }
