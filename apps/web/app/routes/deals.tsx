import { type FormEvent, Fragment, lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { decodeDealFilters, dealMatchesFilterSet, type DealFilterField, type DealFilterSet, pipelineBoardColumns, dealBoardColumn, sum, formatBRL, companyId as companyIdFactory, contactId as contactIdFactory, userId as userIdFactory, type Deal, type Money, type OrgId, type Pipeline, type Stage, type StageId, type DealStatus } from "@spark/core";
import { optimisticPipeline, optimisticStage, optimisticDeal, forInsert, syncedAmount, reorderStages, type StagesCollection } from "@spark/data";
import { FilterBar, SearchField, SegmentedControl, DataTable, type FilterFieldDefinition, type TableColumn, ActionModal, CrmWorkspace, CrmSection, CrmLabel, Chip, Button, InlineEdit, CollectionToolbar, DatePicker, EmptyState, Field, Icon, Input, Label, ListRow, MenuButton, MenuItem, MenuSeparator, Modal, ModalContent, MoneyInput, PageFrame, PageHeader, RowList, Select, Signal, Skeleton, Checkbox, Text, Textarea, KanbanAddButton, KanbanBoard, KanbanCard, KanbanCardContent, KanbanColumn, KanbanDropBar, KanbanDropZone, KanbanGhost, KanbanPlaceholder, KanbanSkeleton, crmColor, useKanbanDrag, userSelectOption, notify, celebrateDealOutcome, type SelectOption } from "@spark/ui-web";
import { getSession } from "../lib/auth.client";
import { getBoardDealsCollection, getPipelinesCollection, getStagesCollection } from "../lib/deals-collections.client";
import { getContactsCollection } from "../lib/contacts-collection.client";
import { getUsersCollection } from "../lib/users-collection.client";
import { getActivitiesCollection } from "../lib/activities-collection.client";
import { getCompaniesCollection } from "../lib/companies-collection.client";
import { requireCapability } from "../lib/route-access.client";
import { RelatedRecords } from "../crm/RelatedRecords";
import { DealTags } from "../crm/DealTags";
import { PhaseFields } from "../crm/PhaseFields";
import { StageSettingsButton } from "../crm/StageSettings";
import { useDealTags } from "../lib/tags.client";
import styles from "./deals.module.css";
const DealWorkspace = lazy(() => import("./deal-detail").then((m) => ({ default: m.DealWorkspace })));

export async function clientLoader() {
  await requireCapability("deals:read");
  void Promise.allSettled([
    getPipelinesCollection().preload(),
    getStagesCollection().preload(),
    getUsersCollection().preload(),
  ]);
  return null;
}

export default function Deals() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [openedDealId, setOpenedDealId] = useState<string | null>(null);
  const tagsByDeal = useDealTags();
  const pipelinesCollection = getPipelinesCollection();
  const stagesCollection = getStagesCollection();
  const contactsCollection = getContactsCollection();
  const usersCollection = getUsersCollection();
  const companiesCollection = getCompaniesCollection();
  const selectedPipelineId = searchParams.get("pipeline");
  function updateQuery(key: string, value: string | null) {
    setSearchParams(previous => { const next = new URLSearchParams(previous); if (value) next.set(key,value); else next.delete(key); return next; }, { replace: true });
  }
  const setSelectedPipelineId = (id: string | null) => updateQuery("pipeline",id);
  const filters = useMemo(() => decodeDealFilters(searchParams.get("filters")), [searchParams]);
  const search = searchParams.get("q") ?? "";
  const listView = searchParams.get("view") === "list";
  const [listPage, setListPage] = useState(0);
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
  function changeFilters(next: DealFilterSet) { updateQuery("filters", next.groups.some(group => group.conditions.length) ? JSON.stringify(next) : null); }

  const requestedStatus = searchParams.get("status");
  const showArchived = requestedStatus === "archived";
  const statusFilter: DealStatus | "all" = requestedStatus === "open" || requestedStatus === "won" || requestedStatus === "lost" ? requestedStatus : "all";
  const [dealModalOpen, setDealModalOpen] = useState(false);
  const [pipelineEditorOpen, setPipelineEditorOpen] = useState(false);
  const [visibleByStage, setVisibleByStage] = useState<Record<string, number>>({});

  const { data: pipelines, isLoading: isLoadingPipelines } = useLiveQuery({
    query: (q) => q.from({ pipelines: pipelinesCollection }),
  });
  const { data: allStages } = useLiveQuery({
    query: (q) => q.from({ stages: stagesCollection }).orderBy(({ stages: s }) => s.sortOrder, "asc"),
  });
  const mainPipeline = pipelines.find((pipeline) => pipeline.id === selectedPipelineId) ?? pipelines.find((pipeline) => pipeline.isDefault) ?? pipelines[0];
  const dealsCollection = useMemo(() => mainPipeline ? getBoardDealsCollection(mainPipeline.id, statusFilter, showArchived) : null, [mainPipeline, statusFilter, showArchived]);
  const { data: deals = [], isLoading: isLoadingDeals } = useLiveQuery({ query: (q) => dealsCollection ? q.from({ deals: dealsCollection }) : undefined }, [dealsCollection]);
  const session = getSession();
  const canReadContacts = session?.capabilities.includes("contacts:read") ?? false;
  const canReadCompanies = session?.capabilities.includes("companies:read") ?? false;
  // Relações volumosas entram somente depois do quadro e apenas para quadros
  // razoáveis. Com milhares de cards, o detalhe continua no workspace do negócio.
  const loadCardDetails = !isLoadingDeals && deals.length <= 2_000;
  const { data: contacts = [] } = useLiveQuery({ query: (q) => canReadContacts && (loadCardDetails || dealModalOpen) ? q.from({ contacts: contactsCollection }).orderBy(({ contacts: contact }) => contact.name, "asc") : undefined }, [canReadContacts, loadCardDetails, dealModalOpen]);
  const { data: users } = useLiveQuery({ query: (q) => q.from({ users: usersCollection }).orderBy(({ users: user }) => user.name, "asc") });
  const canReadActivities = session?.capabilities.includes("activities:read") ?? false;
  const { data: activities = [] } = useLiveQuery({ query: (q) => canReadActivities && loadCardDetails && !dealModalOpen ? q.from({ activities: getActivitiesCollection() }).where(({ activities: item }) => eq(item.completed, false)) : undefined }, [canReadActivities, loadCardDetails, dealModalOpen]);
  /* Próximo passo de cada negócio — o ponto colorido do card do Pipedrive:
   * vermelho quando a atividade venceu, azul quando está agendada, e a
   * ausência dele é o próprio aviso de que ninguém marcou o que vem depois. */
  const nextActivity = useMemo(() => {
    const byDeal = new Map<string, { title: string; scheduledAt: string }>();
    for (const activity of activities) {
      if (!activity.dealId) continue;
      const current = byDeal.get(activity.dealId);
      if (!current || activity.scheduledAt < current.scheduledAt) byDeal.set(activity.dealId, { title: activity.title, scheduledAt: activity.scheduledAt });
    }
    return byDeal;
  }, [activities]);
  const { data: companies = [] } = useLiveQuery({ query: (q) => canReadCompanies && (loadCardDetails || dealModalOpen) ? q.from({ companies: companiesCollection }).orderBy(({ companies: company }) => company.name, "asc") : undefined }, [canReadCompanies, loadCardDetails, dealModalOpen]);

  /* Arrasto do quadro (ui-web/Kanban): fantasma que segue o ponteiro, espaço
   * tracejado no destino e pouso do cartão. Os alvos continuam nativos. */
  const kanban = useKanbanDrag();
  const dragging = kanban.drag?.phase === "drag" ? kanban.drag.id : null;
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [enteringId, setEnteringId] = useState<string | null>(null);
  const [pipelineModalOpen, setPipelineModalOpen] = useState(false);
  const [pipelineName, setPipelineName] = useState("");
  const [targetStageId, setTargetStageId] = useState<string | null>(null);
  const [dealTags, setDealTags] = useState<string[]>([]);
  const [dealCustom, setDealCustom] = useState<Record<string, unknown>>({});
  const [dealName, setDealName] = useState("");
  const [dealAmount, setDealAmount] = useState<Money | null>(null);
  const [dealContact, setDealContact] = useState<SelectOption | null>(null);
  const [dealOwnerId, setDealOwnerId] = useState(() => getSession()?.userId ?? "");
  const [dealCompanyId, setDealCompanyId] = useState("");
  const [expectedCloseDate, setExpectedCloseDate] = useState("");
  const [closingDeal, setClosingDeal] = useState<Deal | null>(null);
  const [lossReason, setLossReason] = useState("");
  const [busyDealId, setBusyDealId] = useState<string | null>(null);
  const [duplicateConfirmed, setDuplicateConfirmed] = useState(false);
  const [moveCandidate, setMoveCandidate] = useState<{ dealId: string; stageId: string | null } | null>(null);
  const [dropAction, setDropAction] = useState<"won" | "lost" | "archived" | "move" | null>(null);
  const movingDeal = moveCandidate ? deals.find((deal) => deal.id === moveCandidate.dealId) ?? null : null;
  const movingPipelineId = movingDeal?.pipelineId ?? mainPipeline?.id ?? "";
  const [movePipelineId, setMovePipelineId] = useState<string>(movingPipelineId);
  const [moveStageId, setMoveStageId] = useState<string | null>(null);

  // Etapa arquivada some do quadro e de "adicionar negócio" — mas continua
  // existindo para os negócios antigos que ainda apontam para ela.
  const stages = mainPipeline ? allStages.filter((s) => s.pipelineId === mainPipeline.id && !s.archivedAt) : [];
  const contactNames = new Map(contacts.map((contact) => [contact.id, contact.name]));
  const companyNames = new Map(companies.map((company) => [company.id, company.name]));
  const canWrite = session?.capabilities.includes("deals:write") ?? false;
  const canMove = session?.capabilities.includes("deals:move") ?? false;
  const canManagePipeline = session?.capabilities.includes("pipelines:manage") ?? false;
  const filteredDeals = useMemo(() => deals.filter(deal => deal.name.toLocaleLowerCase("pt-BR").includes(search.trim().toLocaleLowerCase("pt-BR")) && dealMatchesFilterSet({ ...deal, tags: (tagsByDeal.get(deal.id) ?? []).map(tag => tag.name) }, filters)), [deals, search, filters, tagsByDeal]);
  useEffect(() => { setListPage(0); }, [searchParams]);
  const filterFields: FilterFieldDefinition<DealFilterField>[] = [
    { id: "name", label: "Nome do negócio", type: "text" },
    { id: "amount", label: "Valor (R$)", type: "number" },
    { id: "probabilityBasisPoints", label: "Chance de fechamento (%)", type: "number" },
    { id: "stageId", label: "Etapa", type: "select", options: stages.map(stage => ({ value: stage.id, label: stage.name })) },
    { id: "ownerId", label: "Responsável", type: "select", options: users.map(user => ({ value: user.id, label: user.name })) },
    ...(canReadContacts ? [{ id: "contactId" as const, label: "Pessoa", type: "select" as const, options: contacts.map(contact => ({ value: contact.id, label: contact.name })) }] : []),
    ...(canReadCompanies ? [{ id: "companyId" as const, label: "Empresa", type: "select" as const, options: companies.map(company => ({ value: company.id, label: company.name })) }] : []),
    { id: "expectedCloseDate", label: "Fechamento previsto", type: "date" },
    { id: "createdAt", label: "Data de criação", type: "date" },
    { id: "tags", label: "Etiqueta", type: "list", options: [...new Set([...tagsByDeal.values()].flatMap(tags => tags.map(tag => tag.name)))].map(name => ({ value: name, label: name })) },
  ];
  const listColumns: TableColumn<Deal>[] = [
    { id: "name", label: "Negócio", alwaysVisible: true, cell: deal => deal.name, sortValue: deal => deal.name },
    { id: "stage", label: "Etapa", cell: deal => allStages.find(stage => stage.id === deal.stageId)?.name ?? "—" },
    { id: "amount", label: "Valor", cell: deal => formatBRL(syncedAmount(deal.amount)) },
    { id: "owner", label: "Responsável", cell: deal => users.find(user => user.id === deal.ownerId)?.name ?? "Sem responsável" },
    { id: "chance", label: "Chance estimada", cell: deal => deal.probabilityBasisPoints == null ? "Em análise" : `${Math.round(deal.probabilityBasisPoints / 100)}%` },
    { id: "close", label: "Fechamento previsto", cell: deal => deal.expectedCloseDate ? formatDate(deal.expectedCloseDate) : "—" },
  ];
  const dealsByStage = useMemo(() => {
    const grouped = new Map<string, Deal[]>();
    for (const deal of filteredDeals) {
      const columnId = dealBoardColumn(deal);
      const stageDeals = grouped.get(columnId) ?? [];
      stageDeals.push(deal);
      grouped.set(columnId, stageDeals);
    }
    return grouped;
  }, [filteredDeals]);

  useEffect(() => {
    const personId = searchParams.get("createFor");
    if (!personId || !canWrite || stages.length === 0) return;
    const person = contacts.find((item) => item.id === personId && !item.deletedAt);
    if (!person) return;
    setDealContact({ value: person.id, label: person.name, ...(person.email ? { description: person.email } : {}) });
    setTargetStageId((stages.find((stage) => stage.isEntry) ?? stages[0])!.id);
    setDealModalOpen(true);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("createFor");
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams, contacts, stages, canWrite]);

  async function createPipeline() {
    if (!session || !pipelineName.trim()) throw new Error("MISSING_PIPELINE_NAME");
    const pipeline = optimisticPipeline({ name: pipelineName.trim(), isDefault: pipelines.length === 0 }, session.orgId);
    const pipelineTx = pipelinesCollection.insert(pipeline);
    // A API cria a entrada obrigatória na mesma transação do funil.
    await pipelineTx.isPersisted.promise;
    setSelectedPipelineId(pipeline.id);
    setPipelineName("");
    notify({ title: "Funil criado", description: pipeline.name, tone: "success" });
  }

  function openDealModal(stageId?: string) {
    setTargetStageId(stageId ?? stages.find((stage) => stage.isEntry)?.id ?? stages[0]?.id ?? null);
    setDealModalOpen(true);
  }

  function resetDealForm() {
    setDealName(""); setDealAmount(null); setDealContact(null);
    setDealOwnerId(getSession()?.userId ?? ""); setDealCompanyId(""); setExpectedCloseDate(""); setDuplicateConfirmed(false); setDealTags([]); setDealCustom({});
  }

  // O contato pode ter mais de uma oportunidade aberta — não é um erro, mas
  // criar sem enxergar as que já existem é o jeito mais fácil de duplicar
  // por engano (pedido do usuário, 21/09).
  const existingOpenDeals = useMemo(
    () => dealContact ? deals.filter((item) => item.status === "open" && item.contactId === dealContact.value) : [],
    [deals, dealContact],
  );

  async function addDeal() {
    if (!session || !mainPipeline || !targetStageId || !dealContact || !dealName.trim() || dealAmount === null) throw new Error("Preencha nome, valor, pessoa e etapa para criar o negócio.");
    if (existingOpenDeals.length > 0 && !duplicateConfirmed) throw new Error("Marque a confirmação para criar mesmo já havendo oportunidade aberta.");
    const deal = optimisticDeal({
      pipelineId: mainPipeline.id,
      stageId: targetStageId as StageId,
      contactId: contactIdFactory.from(dealContact.value),
      companyId: dealCompanyId ? companyIdFactory.from(dealCompanyId) : null,
      ownerId: dealOwnerId ? userIdFactory.from(dealOwnerId) : null,
      name: dealName.trim(),
      amount: dealAmount,
      expectedCloseDate: expectedCloseDate || null,
      isArchived: false,
      tags: dealTags,
      customFields: dealCustom,
    }, session.orgId);
    if (!dealsCollection) throw new Error("DEALS_NOT_READY");
    const transaction = dealsCollection.insert(forInsert(deal));
    await transaction.isPersisted.promise;
    // O cartão novo sobe como toast na coluna (origem: Kanban, «Adicionar»).
    setEnteringId(deal.id);
    window.setTimeout(() => setEnteringId((current) => current === deal.id ? null : current), 700);
    notify({ title: "Negócio criado", description: deal.name, tone: "success" });
    resetDealForm();
  }

  async function dropOn(stageId: string) {
    const dealId = dragging;
    const deal = dealId ? deals.find((item) => item.id === dealId) : null;
    setDropTarget(null);
    setDropAction(null);
    // O fantasma espera o cartão aparecer na coluna e o pousa lá.
    kanban.land(stageId);
    if (!deal || !dealsCollection || deal.stageId === stageId) return;
    try {
      const transaction = dealsCollection.update(deal.id, (draft) => { draft.stageId = stageId; });
      await transaction.isPersisted.promise;
      notify({ title: "Negócio movido", description: deal.name, tone: "success" });
    } catch (error) { notify({ title: "Não foi possível mover o negócio", description: error instanceof Error ? error.message : "Revise os campos obrigatórios na ficha do negócio.", tone: "error" }); }
  }

  async function closeDeal(deal: Deal, status: Extract<DealStatus, "won" | "lost">, reason?: string) {
    if (!dealsCollection) return false;
    setBusyDealId(deal.id);
    try {
      const transaction = dealsCollection.update(deal.id, (draft) => {
        draft.status = status;
        if (status === "lost") draft.lossReason = reason?.trim() || null;
      });
      await transaction.isPersisted.promise;
      celebrateDealOutcome({ status, name: deal.name });
      notify({ title: status === "won" ? "Negócio ganho" : "Negócio perdido", description: deal.name, tone: status === "won" ? "success" : "warning" });
      return true;
    } catch { notify({ title: "Não foi possível fechar o negócio", tone: "error" }); return false; }
    finally { setBusyDealId(null); }
  }

  async function archiveDeal(deal: Deal) {
    if (!dealsCollection || !canMove) return;
    try {
      const transaction = dealsCollection.update(deal.id, (draft) => { draft.isArchived = true; });
      await transaction.isPersisted.promise;
      notify({ title: "Negócio arquivado", description: deal.name, tone: "success" });
    } catch { notify({ title: "Não foi possível arquivar o negócio", tone: "error" }); }
  }

  function finishDragAction(action: "won" | "lost" | "archived") {
    const deal = dragging ? deals.find((item) => item.id === dragging) : null;
    setDropTarget(null);
    // Ganho e perdido pousam na coluna do desfecho quando o filtro mostra o
    // negócio fechado; arquivar tira o cartão do quadro.
    const shownAfter = action !== "archived" && !showArchived && (statusFilter === "all" || statusFilter === action);
    kanban.land(shownAfter ? action : null);
    if (!deal) return;
    if (action === "archived") void archiveDeal(deal);
    else void closeDeal(deal, action);
  }

  function openMovePanel() {
    if (!dragging) return;
    setMoveCandidate({ dealId: dragging, stageId: dropTarget });
    setMovePipelineId(mainPipeline?.id ?? "");
    setMoveStageId(dropTarget);
    // Enquanto o painel decide o destino, o cartão volta para a coluna dele.
    kanban.land(kanban.drag?.from ?? null);
    setDropTarget(null);
    setDropAction(null);
  }

  function handleActionDrop(action: "won" | "lost" | "archived" | "move") {
    if (action === "move") openMovePanel();
    else finishDragAction(action);
  }

  async function confirmMove() {
    if (!moveCandidate || !movingDeal || !dealsCollection || !moveStageId) return;
    if (movingDeal.pipelineId === movePipelineId && movingDeal.stageId === moveStageId) {
      setMoveCandidate(null);
      return;
    }
    const transaction = dealsCollection.update(movingDeal.id, (draft) => {
      draft.pipelineId = movePipelineId;
      draft.stageId = moveStageId;
    });
    try { await transaction.isPersisted.promise; notify({ title: "Negócio movido", description: movingDeal.name, tone: "success" }); setMoveCandidate(null); }
    catch (error) { notify({ title: "Não foi possível mover o negócio", description: error instanceof Error ? error.message : "Revise os campos obrigatórios na ficha do negócio.", tone: "error" }); }
  }

  async function saveStageName(id: string, newName: string) {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const transaction = stagesCollection.update(id, (draft) => { draft.name = trimmed; });
    await transaction.isPersisted.promise;
  }

  if (!mainPipeline) {
    return (
      <PageFrame className={styles.pagina}>
        <PageHeader icon="briefcase" title="Funil de vendas" />
        {isLoadingPipelines
          ? <KanbanSkeleton label="Carregando funis" />
          : <EmptyState variant="featured" icon="briefcase" title="Organize seu primeiro funil" description="Defina as etapas da venda para acompanhar cada oportunidade e o valor da negociação." action={canManagePipeline ? <Button onClick={() => { setPipelineName("Funil de Vendas"); setPipelineModalOpen(true); }}>Criar funil</Button> : undefined} />}
        <ActionModal open={pipelineModalOpen} onOpenChange={setPipelineModalOpen} title="Novo funil" confirmLabel="Criar funil" errorText="Informe um nome para o funil." onConfirm={createPipeline}>
          <Field><Label>Nome do funil</Label><Input value={pipelineName} onChange={(event) => setPipelineName(event.target.value)} placeholder="Ex.: Vendas consultivas" /></Field>
        </ActionModal>
      </PageFrame>
    );
  }

  /* Ordem em que o quadro mostra os negócios: a coluna de destino repete esta
   * ordem, então o espaço tracejado aparece exatamente onde o cartão vai cair. */
  const boardOrder = new Map<string, number>(deals.map((deal, index) => [deal.id, index]));
  const nowIso = new Date().toISOString();
  const draggedDeal = kanban.drag ? deals.find((deal) => deal.id === kanban.drag?.id) : undefined;

  /** O miolo do cartão: o mesmo no quadro e no fantasma que segue o ponteiro. */
  function dealCard(deal: Deal, interactive: boolean) {
    const isOpen = deal.status === "open" && !deal.isArchived;
    const next = nextActivity.get(deal.id);
    const overdue = next ? next.scheduledAt < nowIso : false;
    const owner = deal.ownerId ? users.find((user) => user.id === deal.ownerId) : undefined;
    const statusLabel = deal.isArchived ? `Arquivado · ${deal.status === "won" ? "Ganho" : deal.status === "lost" ? "Perdido" : "Em aberto"}` : deal.status === "won" ? "Ganho" : "Perdido";
    const chips = [
      ...(isOpen ? [<Chip key="probability" size="sm" title={`Estimativa inicial, não calibrada. ${deal.probabilitySampleSize ?? 0} negócios encerrados no funil. ${deal.probabilityCalculatedAt ? `Calculada em ${new Date(deal.probabilityCalculatedAt).toLocaleString("pt-BR")}.` : "Aguardando processamento."}`}>{deal.probabilityBasisPoints == null ? "Chance em análise" : `${Math.round(deal.probabilityBasisPoints / 100)}% · estimativa`}</Chip>] : []),
      ...(isOpen ? [] : [<Chip key="status" size="sm" dot tone={deal.isArchived ? "neutral" : deal.status === "won" ? "success" : "danger"}>{statusLabel}</Chip>]),
      ...(tagsByDeal.get(deal.id) ?? []).map((tag) => <CrmLabel key={tag.id} size="sm" color={tag.color}>{tag.name}</CrmLabel>),
    ];
    const subtitle = [deal.contactId ? contactNames.get(deal.contactId) ?? "Contato indisponível" : null, deal.companyId ? companyNames.get(deal.companyId) ?? "Empresa indisponível" : null].filter(Boolean).join(" · ");
    return <KanbanCardContent
      title={interactive ? <Link to={`/deals/${deal.id}`} onClick={(event) => { if (!event.metaKey && !event.ctrlKey && !event.shiftKey && event.button === 0) { event.preventDefault(); setOpenedDealId(deal.id); } }}>{deal.name}</Link> : deal.name}
      subtitle={subtitle || undefined}
      actions={interactive ? <MenuButton size="sm" variant="ghost" iconOnly indicator={false} icon={<Icon name="more" />} aria-label={`Ações do negócio ${deal.name}`} disabled={busyDealId === deal.id} menu={<>
        <MenuItem icon={<Icon name="eye" />} onClick={() => setOpenedDealId(deal.id)}>Abrir visão rápida</MenuItem>
        <MenuItem icon={<Icon name="page" />} render={<Link to={`/deals/${deal.id}`} />}>Abrir página completa</MenuItem>
        {!deal.isArchived && canMove && <><MenuSeparator /><MenuItem icon={<Icon name="right" />} onClick={() => { setMoveCandidate({ dealId: deal.id, stageId: deal.stageId }); setMovePipelineId(deal.pipelineId); setMoveStageId(deal.stageId); }}>Mover negócio</MenuItem>{isOpen && <><MenuItem icon={<Icon name="check" />} onClick={() => void closeDeal(deal, "won")}>Marcar como ganho</MenuItem><MenuItem icon={<Icon name="close" />} onClick={() => { setLossReason(""); setClosingDeal(deal); }}>Marcar como perdido</MenuItem></>}<MenuSeparator /><MenuItem icon={<Icon name="folder" />} onClick={() => void archiveDeal(deal)}>Arquivar negócio</MenuItem></>}
      </>} /> : undefined}
      chips={chips}
      value={formatBRL(syncedAmount(deal.amount))}
      /* Próximo passo como sinal (ponto + texto curto): vermelho é atraso,
       * azul é agendado, âmbar é ninguém marcou o que vem depois. */
      signal={canReadActivities && isOpen ? <Signal tone={!next ? "warning" : overdue ? "danger" : "info"}>{next ? `${overdue ? "Atrasada" : "Próxima"}: ${next.title}` : "Sem próximo passo"}</Signal> : undefined}
      owner={owner ? { name: owner.name, avatarUrl: owner.avatarUrl } : deal.ownerId ? { name: "Usuário indisponível" } : null}
      date={deal.expectedCloseDate ? formatDate(deal.expectedCloseDate) : undefined}
    />;
  }

  return (
    <PageFrame className={styles.pagina}>
      <PageHeader title={mainPipeline.name} actions={<>
        <MenuButton variant="secondary" menu={<>
          {pipelines.map(pipeline => <MenuItem key={pipeline.id} onClick={() => setSelectedPipelineId(pipeline.id)}>{pipeline.name}</MenuItem>)}
          {canManagePipeline && <><MenuSeparator /><MenuItem icon={<Icon name="pencil" />} onClick={() => setPipelineEditorOpen(true)}>Configurar este funil</MenuItem><MenuItem icon={<Icon name="plus" />} onClick={() => { setPipelineName(""); setPipelineModalOpen(true); }}>Novo funil</MenuItem></>}
        </>}>Funis</MenuButton>
        {canWrite && <Button icon={<Icon name="plus" />} onClick={() => openDealModal()}>Novo negócio</Button>}
      </>} />
      <CollectionToolbar
        search={<SearchField label="Buscar negócios" placeholder="Buscar negócio por nome" value={search} onValueChange={value => updateQuery("q",value)} />}
        filters={<>
          <Select appearance="filter" label="Situação dos negócios" value={showArchived ? "archived" : statusFilter} options={[{ value: "open", label: "Em aberto" }, { value: "won", label: "Ganhos" }, { value: "lost", label: "Perdidos" }, { value: "archived", label: "Arquivados" }, { value: "all", label: "Todas as situações" }]} onValueChange={value => updateQuery("status",value)} />
          <FilterBar fields={filterFields} value={filters} onChange={changeFilters} label="Filtros avançados" />
          {(filters.groups.length > 0 || search) && <Button variant="ghost" onClick={() => setSearchParams(previous => { const next = new URLSearchParams(previous); next.delete("filters"); next.delete("q"); return next; }, { replace: true })}>Limpar</Button>}
        </>}
        count={isLoadingDeals ? "Carregando negócios…" : `${filteredDeals.length} de ${deals.length} negócios · ${formatBRL(sum(filteredDeals.map(deal => syncedAmount(deal.amount))))}`}
        actions={<SegmentedControl label="Visualização dos negócios" value={listView ? "list" : "board"} options={[{value:"board",label:"Kanban"},{value:"list",label:"Lista"}]} onValueChange={value => updateQuery("view",value)} />}
      />
      {listView ? <div className={styles.listView}>
        <DataTable label="Negócios do funil" rows={filteredDeals.slice(listPage * 50, (listPage + 1) * 50)} columns={listColumns} rowKey={deal => deal.id} rowLabel={deal => deal.name} state={isLoadingDeals ? "loading" : "ready"} hiddenColumnIds={hiddenColumns} onHiddenColumnsChange={setHiddenColumns} onRowOpen={(deal, options) => { if (options.newTab) window.open(`/deals/${deal.id}`, "_blank", "noopener,noreferrer"); else setOpenedDealId(deal.id); }} emptyText="Nenhum negócio corresponde aos filtros." />
        {filteredDeals.length > 50 && <div className={styles.listPagination}><Button variant="ghost" disabled={listPage === 0} onClick={() => setListPage(page => page - 1)}>Anterior</Button><Text>Página {listPage + 1} de {Math.ceil(filteredDeals.length / 50)}</Text><Button variant="ghost" disabled={(listPage + 1) * 50 >= filteredDeals.length} onClick={() => setListPage(page => page + 1)}>Próxima</Button></div>}
      </div> :
      <KanbanBoard label={`Quadro do funil ${mainPipeline.name}`}>
        {pipelineBoardColumns(stages).map((stage) => {
          const allStageDeals = dealsByStage.get(stage.id) ?? [];
          const visibleCount = visibleByStage[stage.id] ?? 50;
          const stageDeals = allStageDeals.slice(0, visibleCount);
          const total = sum(allStageDeals.map((d) => syncedAmount(d.amount)));
          const present = stageDeals.filter((deal) => !kanban.isAway(deal.id, stage.id));
          const draggedOrder = kanban.drag ? boardOrder.get(kanban.drag.id) : undefined;
          const placeholderAt = kanban.drag?.phase === "drag" && dropTarget === stage.id
            ? (draggedOrder === undefined ? present.length : present.filter((deal) => (boardOrder.get(deal.id) ?? 0) < draggedOrder).length)
            : -1;

          return (
            <KanbanColumn
              key={stage.id}
              columnId={stage.id}
              aria-label={stage.name}
              /* A cor da etapa vive num ponto de 8px; ganho e perdido usam a tinta do estado. */
              dot={stage.kind === "outcome" ? (stage.id === "won" ? "var(--ok)" : "var(--er)") : crmColor(stage.color)}
              title={stage.kind === "stage" && canManagePipeline
                ? <InlineEdit label={`nome da etapa ${stage.name}`} value={stage.name} appearance="compact" wrap saveOnBlur onSave={(name) => saveStageName(stage.id, name)} />
                : stage.name}
              count={isLoadingDeals ? "…" : allStageDeals.length - (stageDeals.length === present.length ? 0 : 1)}
              total={isLoadingDeals ? undefined : formatBRL(total)}
              actions={stage.kind === "stage" && canManagePipeline ? <StageSettingsButton stage={stage} stages={stages} /> : undefined}
              over={kanban.drag?.phase === "drag" && dropTarget === stage.id}
              onDragOver={(event) => {
                event.preventDefault();
                setDropTarget(stage.id);
              }}
              onDrop={(event) => {
                event.preventDefault();
                if (stage.kind === "outcome") finishDragAction(stage.id);
                else void dropOn(stage.id);
              }}
              footer={<>
                {stageDeals.length < allStageDeals.length && <Button variant="ghost" size="sm" onClick={() => setVisibleByStage((current) => ({ ...current, [stage.id]: visibleCount + 50 }))}>Mostrar mais {Math.min(50, allStageDeals.length - stageDeals.length)}</Button>}
                {stage.kind === "stage" && canWrite && <KanbanAddButton onClick={() => openDealModal(stage.id)}>Adicionar negócio</KanbanAddButton>}
              </>}
            >
              {isLoadingDeals && <Skeleton className={styles.loadingCard} />}
              {stageDeals.map((deal, index) => {
                const isOpen = deal.status === "open" && !deal.isArchived;
                const before = placeholderAt >= 0 && present.indexOf(deal) === placeholderAt;
                return <Fragment key={deal.id}>
                  {before && <KanbanPlaceholder height={kanban.drag?.height ?? 0} />}
                  <KanbanCard
                    cardId={deal.id}
                    index={index}
                    entering={enteringId === deal.id}
                    away={kanban.isAway(deal.id, stage.id)}
                    draggable={isOpen && canMove}
                    onDragStart={(event) => kanban.start(event, deal.id, stage.id)}
                    onDragEnd={() => {
                      kanban.end();
                      setDropTarget(null);
                      setDropAction(null);
                    }}
                    /* O cartão inteiro abre o negócio. O título continua sendo
                     * um link de verdade (teclado, nova aba, leitor de tela);
                     * aqui só se acrescenta o alvo do mouse. Menu e texto
                     * selecionado ficam de fora. */
                    onClick={(event) => {
                      const alvo = event.target;
                      if (alvo instanceof Element && alvo.closest("a, button, input, [role='menu']")) return;
                      if (window.getSelection()?.toString()) return;
                      setOpenedDealId(deal.id);
                    }}
                  >{dealCard(deal, true)}</KanbanCard>
                </Fragment>;
              })}
              {placeholderAt >= 0 && placeholderAt >= present.length && <KanbanPlaceholder height={kanban.drag?.height ?? 0} />}
            </KanbanColumn>
          );
        })}
      </KanbanBoard>}
      <KanbanGhost drag={kanban.drag} ghostRef={kanban.ghostRef} origin={kanban.origin}>{draggedDeal && dealCard(draggedDeal, false)}</KanbanGhost>
      {canMove && dragging && <KanbanDropBar label="Soltar o negócio numa ação">
        {(["won", "lost", "archived", "move"] as const).map((action) => {
          const labels = { won: "Ganho", lost: "Perdido", archived: "Arquivar", move: "Mover negócio" };
          const descriptions = { won: "Soltar para marcar como ganho", lost: "Soltar para marcar como perdido", archived: "Soltar para arquivar mantendo o status", move: "Soltar para escolher funil e etapa" };
          return <KanbanDropZone key={action} over={dropAction === action} tone={action === "won" ? "success" : action === "lost" ? "danger" : "neutral"} icon={action === "won" ? <Icon name="check" /> : action === "lost" ? <Icon name="close" /> : action === "archived" ? <Icon name="folder" /> : <Icon name="right" />} onDragEnter={(event) => { event.preventDefault(); setDropTarget(null); setDropAction(action); }} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; setDropAction(action); }} onDragLeave={() => setDropAction((current) => current === action ? null : current)} onDrop={(event) => { event.preventDefault(); setDropAction(null); handleActionDrop(action); }} onClick={() => handleActionDrop(action)} aria-label={descriptions[action]}>{dropAction === action ? "Soltar aqui" : labels[action]}</KanbanDropZone>;
        })}
      </KanbanDropBar>}
      <Modal open={moveCandidate !== null} onOpenChange={(open) => { if (!open) setMoveCandidate(null); }}>
        <ModalContent title="Mover negócio" description={movingDeal ? movingDeal.name : "Escolha o destino antes de confirmar."} placement="bottom" footer={<><Button variant="ghost" onClick={() => setMoveCandidate(null)}>Cancelar</Button><Button onClick={() => void confirmMove()} disabled={!moveStageId}>Confirmar movimento</Button></>}>
          {movingDeal && <div className={styles.movePanelFields}>
            <Field><Label>Funil</Label><Select label="Funil de destino" value={movePipelineId} options={pipelines.filter((pipeline) => !pipeline.archivedAt).map((pipeline) => ({ value: pipeline.id, label: pipeline.name }))} onValueChange={(value) => { if (value) { setMovePipelineId(value); setMoveStageId(allStages.find((stage) => stage.pipelineId === value && !stage.archivedAt)?.id ?? null); } }} /></Field>
            <Field><Label>Etapa</Label><Select label="Etapa de destino" value={moveStageId} options={allStages.filter((stage) => stage.pipelineId === movePipelineId && !stage.archivedAt).map((stage) => ({ value: stage.id, label: stage.name }))} onValueChange={setMoveStageId} /></Field>
          </div>}
        </ModalContent>
      </Modal>
      {/* Criar, arquivar e reordenar etapa moram atrás do lápis ao lado do
        * nome do funil — nunca abertos no quadro. É a mesma decisão do
        * Pipedrive: essa permissão não é de todo mundo, e um formulário
        * sempre aberto no fim das colunas convida quem não deveria mexer. */}
      {canManagePipeline && <PipelineEditorModal
        open={pipelineEditorOpen}
        onOpenChange={setPipelineEditorOpen}
        pipeline={mainPipeline}
        stages={stages}
        stagesCollection={stagesCollection}
        orgId={session?.orgId}
      />}
      <ActionModal open={pipelineModalOpen} onOpenChange={setPipelineModalOpen} title="Novo funil" confirmLabel="Criar funil" errorText="Informe um nome para o funil." onConfirm={createPipeline}>
        <Field><Label>Nome do funil</Label><Input value={pipelineName} onChange={(event) => setPipelineName(event.target.value)} placeholder="Ex.: Vendas consultivas" /></Field>
      </ActionModal>
      {dealModalOpen && <ActionModal open onOpenChange={(open) => { setDealModalOpen(open); if (!open) resetDealForm(); }} title="Novo negócio" size="workspace" confirmLabel="Criar negócio" onConfirm={addDeal}>
        <CrmWorkspace context={<RelatedRecords contactId={dealContact?.value ?? null} companyId={dealCompanyId || null} onContact={(person) => { setDealContact(person ? { value: person.id, label: person.name } : null); setDuplicateConfirmed(false); }} onCompany={(company) => setDealCompanyId(company?.id ?? "")} />} current={<CrmSection title="Negócio">
          <Field><Label>Nome do negócio</Label><Input autoFocus value={dealName} onChange={(event) => setDealName(event.target.value)} placeholder="Ex.: Contrato anual Acme" /></Field>
          <Field><Label>Valor inicial</Label><MoneyInput label="Valor do negócio" value={dealAmount} onValueChange={setDealAmount} /></Field>
          <Field><Label>Responsável</Label><Select label="Responsável pelo negócio" value={dealOwnerId || null} placeholder="Não atribuído" options={users.filter((user) => !user.deactivatedAt).map(userSelectOption)} onValueChange={(value) => setDealOwnerId(value ?? "")} /></Field>
          <Field><Label>Etapa inicial</Label><Select label="Etapa inicial" value={targetStageId} options={stages.map((stage) => ({ value: stage.id, label: stage.name }))} onValueChange={setTargetStageId} /></Field>
          <Field><Label>Previsão de fechamento</Label><DatePicker label="Previsão de fechamento" value={expectedCloseDate} onValueChange={setExpectedCloseDate} /></Field>
          <DealTags value={dealTags} onChange={setDealTags} />
          {existingOpenDeals.length > 0 && <Field><Label>{dealContact?.label} já tem oportunidade aberta</Label><RowList label="Oportunidades abertas desta pessoa">{existingOpenDeals.map((item, index) => <ListRow key={item.id} index={index} icon="briefcase" title={item.name} meta={formatBRL(syncedAmount(item.amount))} />)}</RowList><Checkbox checked={duplicateConfirmed} onCheckedChange={(checked) => setDuplicateConfirmed(checked === true)}>Criar outra oportunidade</Checkbox></Field>}
        </CrmSection>} actions={stages.filter((stage) => stage.id === targetStageId).map((stage) => <PhaseFields key={stage.id} stage={stage} stages={stages} values={dealCustom} onSave={async (key, value) => setDealCustom((current) => ({ ...current, [key]: value }))} />)} />
      </ActionModal>}
      <Modal open={openedDealId !== null} onOpenChange={(open) => { if (!open) setOpenedDealId(null); }}>
        <ModalContent title="Visão rápida" size="workspace" bodyDensity="flush" closeLabel="Voltar ao pipeline" headerAction={openedDealId ? <Button variant="ghost" icon={<Icon name="page" />} render={<Link to={`/deals/${openedDealId}`} />}>Abrir página completa</Button> : undefined}>
          {openedDealId && <Suspense fallback={<Skeleton className={styles.loadingCard} />}><DealWorkspace dealId={openedDealId} embedded /></Suspense>}
        </ModalContent>
      </Modal>
      <ActionModal open={closingDeal !== null} onOpenChange={(open) => { if (!open) { setClosingDeal(null); setLossReason(""); } }} title="Marcar negócio como perdido" confirmLabel="Confirmar perda" errorText="Não foi possível fechar o negócio." onConfirm={async () => { if (!closingDeal) return; const closed = await closeDeal(closingDeal, "lost", lossReason); if (!closed) throw new Error("CLOSE_FAILED"); setClosingDeal(null); }}>
        <Field><Label>Motivo da perda</Label><Textarea value={lossReason} onChange={(event) => setLossReason(event.target.value)} placeholder="O que impediu o fechamento?" /></Field>
      </ActionModal>
    </PageFrame>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(value));
}

/**
 * Criar, arquivar e reordenar etapa — tudo atrás do lápis ao lado do nome do
 * funil, nunca aberto no quadro (docs/inspiration/pipedrive P025: o editor de
 * pipeline do Pipedrive é uma tela própria, não uma coluna sempre disponível).
 *
 * Arrastar reordena TODAS as etapas de uma vez (`reorderStages`), não uma por
 * uma — a mesma razão que o servidor já impõe (packages/data/stages-collection).
 */
function PipelineEditorModal({ open, onOpenChange, pipeline, stages, stagesCollection, orgId }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pipeline: Pipeline;
  stages: readonly Stage[];
  stagesCollection: StagesCollection;
  orgId: OrgId | undefined;
}) {
  const [order, setOrder] = useState<string[]>(() => stages.map((stage) => stage.id));
  const [dragging, setDragging] = useState<string | null>(null);
  const [busyStageId, setBusyStageId] = useState<string | null>(null);
  const [newStageName, setNewStageName] = useState("");
  const [creating, setCreating] = useState(false);

  // A ordem local acompanha a sincronizada — exceto durante um arrasto em
  // andamento, quando ela é a única fonte da verdade até a gravação confirmar.
  useEffect(() => {
    if (dragging) return;
    setOrder(stages.map((stage) => stage.id));
  }, [stages, dragging]);

  const orderedStages = order.map((id) => stages.find((stage) => stage.id === id)).filter((stage): stage is Stage => stage !== undefined);

  async function commitReorder(nextOrder: string[]) {
    const previous = order;
    setOrder(nextOrder);
    try {
      await reorderStages(pipeline.id, nextOrder);
    } catch {
      setOrder(previous);
      notify({ title: "Não foi possível reordenar as etapas", tone: "error" });
    }
  }

  async function archiveStage(stage: Stage) {
    setBusyStageId(stage.id);
    try {
      const transaction = stagesCollection.update(stage.id, (draft) => { draft.archivedAt = new Date().toISOString(); });
      await transaction.isPersisted.promise;
      notify({ title: "Etapa arquivada", description: stage.name, tone: "success" });
    } catch (cause) {
      notify({ title: "Não foi possível arquivar a etapa", tone: "error", ...(cause instanceof Error && cause.message ? { description: cause.message } : {}) });
    } finally {
      setBusyStageId(null);
    }
  }

  async function addStage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newStageName.trim();
    if (!name || !orgId) return;
    setCreating(true);
    try {
      const stage = optimisticStage({ pipelineId: pipeline.id, name, sortOrder: stages.length }, orgId);
      const transaction = stagesCollection.insert(stage);
      await transaction.isPersisted.promise;
      setNewStageName("");
    } catch {
      notify({ title: "Não foi possível criar a etapa", tone: "error" });
    } finally {
      setCreating(false);
    }
  }

  return <Modal open={open} onOpenChange={onOpenChange}>
    <ModalContent title={`Editar ${pipeline.name}`} description="A entrada é obrigatória e pode mudar de nome e posição. Ganhos e Perdidos ficam sempre no final.">
      <RowList label={`Etapas de ${pipeline.name}`}>
        {pipelineBoardColumns(orderedStages.map((stage, sortOrder) => ({ ...stage, sortOrder }))).map((stage, index) => <ListRow
          key={stage.id}
          index={index}
          icon={stage.kind === "outcome" ? "lock" : "grip"}
          title={stage.kind === "stage" ? <InlineEdit label="nome da etapa" value={stage.name} onSave={async (name) => { const transaction = stagesCollection.update(stage.id, (draft) => { draft.name = name.trim(); }); await transaction.isPersisted.promise; }} /> : stage.name}
          trailing={stage.kind === "stage" ? <>
            <StageSettingsButton stage={stage} stages={orderedStages} />
            {!stage.isEntry && <Button variant="ghost" size="sm" iconOnly icon={<Icon name="trash" />} aria-label={`Arquivar etapa ${stage.name}`} loading={busyStageId === stage.id} onClick={() => void archiveStage(stage)} />}
          </> : undefined}
          dragging={dragging === stage.id}
          draggable={stage.kind === "stage"}
          onDragStart={() => { if (stage.kind === "stage") setDragging(stage.id); }}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            if (stage.kind === "outcome" || !dragging || dragging === stage.id) return;
            const from = order.indexOf(dragging);
            const to = order.indexOf(stage.id);
            if (from === -1 || to === -1) return;
            const next = [...order];
            next.splice(from, 1);
            next.splice(to, 0, dragging);
            void commitReorder(next);
          }}
          onDragEnd={() => setDragging(null)}
        />)}
      </RowList>
      {orderedStages.length === 0 && <Text tone="muted">Este funil ainda não tem etapa.</Text>}
      <form className={styles.editorNovo} onSubmit={(event) => void addStage(event)}>
        <Field><Label>Nova etapa</Label><Input value={newStageName} onChange={(event) => setNewStageName(event.target.value)} placeholder="Ex.: Proposta enviada" /></Field>
        <Button type="submit" variant="secondary" loading={creating}>+ Etapa</Button>
      </form>
    </ModalContent>
  </Modal>;
}
