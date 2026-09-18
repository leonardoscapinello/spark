import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { sum, formatBRL, companyId as companyIdFactory, contactId as contactIdFactory, userId as userIdFactory, type Deal, type Money, type OrgId, type Pipeline, type Stage, type StageId, type DealStatus } from "@spark/core";
import { optimisticPipeline, optimisticStage, optimisticDeal, forInsert, syncedAmount, reorderStages, type StagesCollection } from "@spark/data";
import { ActionModal, Button, CollectionToolbar, DatePicker, EmptyState, Field, Icon, Input, Label, MenuButton, MenuItem, Modal, ModalContent, MoneyInput, PageFrame, PageHeader, SearchSelect, Select, Skeleton, Textarea, userSelectOption, notify, type SelectOption } from "@spark/ui-web";
import { getSession } from "../lib/auth.client";
import { getBoardDealsCollection, getPipelinesCollection, getStagesCollection } from "../lib/deals-collections.client";
import { getContactsCollection } from "../lib/contacts-collection.client";
import { getUsersCollection } from "../lib/users-collection.client";
import { getActivitiesCollection } from "../lib/activities-collection.client";
import { getCompaniesCollection } from "../lib/companies-collection.client";
import { requireCapability } from "../lib/route-access.client";
import styles from "./deals.module.css";

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
  const navigate = useNavigate();
  const pipelinesCollection = getPipelinesCollection();
  const stagesCollection = getStagesCollection();
  const contactsCollection = getContactsCollection();
  const usersCollection = getUsersCollection();
  const companiesCollection = getCompaniesCollection();
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null);
  const requestedStatus = searchParams.get("status");
  const statusFilter: DealStatus | "all" = requestedStatus === "won" || requestedStatus === "lost" || requestedStatus === "all" ? requestedStatus : "open";
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
  const dealsCollection = useMemo(() => mainPipeline ? getBoardDealsCollection(mainPipeline.id, statusFilter) : null, [mainPipeline, statusFilter]);
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

  const [dragging, setDragging] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [renamingStage, setRenamingStage] = useState<string | null>(null);
  const [pipelineModalOpen, setPipelineModalOpen] = useState(false);
  const [pipelineName, setPipelineName] = useState("");
  const [targetStageId, setTargetStageId] = useState<string | null>(null);
  const [dealName, setDealName] = useState("");
  const [dealAmount, setDealAmount] = useState<Money | null>(null);
  const [dealContact, setDealContact] = useState<SelectOption | null>(null);
  const [dealOwnerId, setDealOwnerId] = useState(() => getSession()?.userId ?? "");
  const [dealCompanyId, setDealCompanyId] = useState("");
  const [expectedCloseDate, setExpectedCloseDate] = useState("");
  const [closingDeal, setClosingDeal] = useState<Deal | null>(null);
  const [lossReason, setLossReason] = useState("");
  const [busyDealId, setBusyDealId] = useState<string | null>(null);

  // Etapa arquivada some do quadro e de "adicionar negócio" — mas continua
  // existindo para os negócios antigos que ainda apontam para ela.
  const stages = mainPipeline ? allStages.filter((s) => s.pipelineId === mainPipeline.id && !s.archivedAt) : [];
  const contactNames = new Map(contacts.map((contact) => [contact.id, contact.name]));
  const userNames = new Map(users.map((user) => [user.id, user.name]));
  const companyNames = new Map(companies.map((company) => [company.id, company.name]));
  const canWrite = session?.capabilities.includes("deals:write") ?? false;
  const canMove = session?.capabilities.includes("deals:move") ?? false;
  const canManagePipeline = session?.capabilities.includes("pipelines:manage") ?? false;
  const dealsByStage = useMemo(() => {
    const grouped = new Map<string, Deal[]>();
    for (const deal of deals) {
      const stageDeals = grouped.get(deal.stageId) ?? [];
      stageDeals.push(deal);
      grouped.set(deal.stageId, stageDeals);
    }
    return grouped;
  }, [deals]);

  useEffect(() => {
    const personId = searchParams.get("createFor");
    if (!personId || !canWrite || stages.length === 0) return;
    const person = contacts.find((item) => item.id === personId && !item.deletedAt);
    if (!person) return;
    setDealContact({ value: person.id, label: person.name, ...(person.email ? { description: person.email } : {}) });
    setTargetStageId(stages[0]!.id);
    setDealModalOpen(true);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("createFor");
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams, contacts, stages, canWrite]);

  async function createPipeline() {
    if (!session || !pipelineName.trim()) throw new Error("MISSING_PIPELINE_NAME");
    const pipeline = optimisticPipeline({ name: pipelineName.trim(), isDefault: pipelines.length === 0 }, session.orgId);
    const pipelineTx = pipelinesCollection.insert(pipeline);
    // The pipeline must exist on the server before its stages are written (FK).
    await pipelineTx.isPersisted.promise;
    const stageWrites = ["Novo", "Em negociação", "Fechado"].map((name, sortOrder) => {
      const stage = optimisticStage({ pipelineId: pipeline.id, name, sortOrder }, session.orgId);
      return stagesCollection.insert(stage).isPersisted.promise;
    });
    await Promise.all(stageWrites);
    setSelectedPipelineId(pipeline.id);
    setPipelineName("");
    notify({ title: "Funil criado", description: pipeline.name, tone: "success" });
  }

  function openDealModal(stageId?: string) {
    setTargetStageId(stageId ?? stages[0]?.id ?? null);
    setDealModalOpen(true);
  }

  function resetDealForm() {
    setDealName(""); setDealAmount(null); setDealContact(null);
    setDealOwnerId(getSession()?.userId ?? ""); setDealCompanyId(""); setExpectedCloseDate("");
  }

  async function addDeal() {
    if (!session || !mainPipeline || !targetStageId || !dealContact || !dealName.trim() || dealAmount === null) throw new Error("MISSING_FIELDS");
    const deal = optimisticDeal({
      pipelineId: mainPipeline.id,
      stageId: targetStageId as StageId,
      contactId: contactIdFactory.from(dealContact.value),
      companyId: dealCompanyId ? companyIdFactory.from(dealCompanyId) : null,
      ownerId: dealOwnerId ? userIdFactory.from(dealOwnerId) : null,
      name: dealName.trim(),
      amount: dealAmount,
      expectedCloseDate: expectedCloseDate || null,
    }, session.orgId);
    if (!dealsCollection) throw new Error("DEALS_NOT_READY");
    const transaction = dealsCollection.insert(forInsert(deal));
    await transaction.isPersisted.promise;
    notify({ title: "Negócio criado", description: deal.name, tone: "success" });
    resetDealForm();
  }

  async function dropOn(stageId: string) {
    if (dragging && dealsCollection) {
      const transaction = dealsCollection.update(dragging, (draft) => {
        draft.stageId = stageId;
      });
      try { await transaction.isPersisted.promise; notify({ title: "Negócio movido", tone: "success" }); }
      catch { notify({ title: "Não foi possível mover o negócio", tone: "error" }); }
    }
    setDragging(null);
    setDropTarget(null);
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
      notify({ title: status === "won" ? "Negócio ganho" : "Negócio perdido", description: deal.name, tone: status === "won" ? "success" : "warning" });
      return true;
    } catch { notify({ title: "Não foi possível fechar o negócio", tone: "error" }); return false; }
    finally { setBusyDealId(null); }
  }

  function saveStageName(id: string, newName: string) {
    const trimmed = newName.trim();
    if (trimmed) {
      stagesCollection.update(id, (draft) => {
        draft.name = trimmed;
      });
    }
    setRenamingStage(null);
  }

  if (!mainPipeline) {
    return (
      <PageFrame className={styles.pagina}>
        <PageHeader icon="briefcase" title="Funil de vendas" />
        {isLoadingPipelines
          ? <div className={styles.board} role="status" aria-label="Carregando funis">{[0, 1, 2].map((column) => <div key={column} className={styles.coluna}><Skeleton className={styles.loadingTitle} /><Skeleton className={styles.loadingValue} /><Skeleton className={styles.loadingCard} /><Skeleton className={styles.loadingCard} /></div>)}</div>
          : <EmptyState variant="featured" icon="briefcase" title="Organize seu primeiro funil" description="Defina as etapas da venda para acompanhar cada oportunidade e o valor da negociação." action={canManagePipeline ? <Button onClick={() => { setPipelineName("Funil de Vendas"); setPipelineModalOpen(true); }}>Criar funil</Button> : undefined} />}
        <ActionModal open={pipelineModalOpen} onOpenChange={setPipelineModalOpen} title="Novo funil" confirmLabel="Criar funil" errorText="Informe um nome para o funil." onConfirm={createPipeline}>
          <Field><Label>Nome do funil</Label><Input value={pipelineName} onChange={(event) => setPipelineName(event.target.value)} placeholder="Ex.: Vendas consultivas" /></Field>
        </ActionModal>
      </PageFrame>
    );
  }

  return (
    <PageFrame className={styles.pagina}>
      <PageHeader icon="briefcase" title={mainPipeline.name} actions={<>{canManagePipeline && <Button variant="ghost" iconOnly icon={<Icon name="pencil" />} aria-label={`Editar ${mainPipeline.name}`} onClick={() => setPipelineEditorOpen(true)} />}{canManagePipeline && <Button variant="secondary" onClick={() => { setPipelineName(""); setPipelineModalOpen(true); }}>Novo funil</Button>}{canWrite && <Button onClick={() => openDealModal()}>Novo negócio</Button>}</>} />
      <div className={styles.toolbar}><CollectionToolbar filters={<>
        <Select appearance="filter" label="Funil" value={mainPipeline?.id ?? null} options={pipelines.map((pipeline) => ({ value: pipeline.id, label: pipeline.name }))} onValueChange={(value) => setSelectedPipelineId(value)} />
        <Select appearance="filter" label="Situação dos negócios" value={statusFilter} options={[{ value: "open", label: "Em aberto" }, { value: "won", label: "Ganhos" }, { value: "lost", label: "Perdidos" }, { value: "all", label: "Todos" }]} onValueChange={(value) => setSearchParams(value && value !== "open" ? { status: value } : {})} />
      </>} count={`${deals.length} ${deals.length === 1 ? "negócio" : "negócios"} · ${formatBRL(sum(deals.map((deal) => syncedAmount(deal.amount))))}`} /></div>

      <div className={styles.board}>
        {stages.map((stage) => {
          const allStageDeals = dealsByStage.get(stage.id) ?? [];
          const visibleCount = visibleByStage[stage.id] ?? 50;
          const stageDeals = allStageDeals.slice(0, visibleCount);
          const total = sum(allStageDeals.map((d) => syncedAmount(d.amount)));

          return (
            <section
              key={stage.id}
              className={[styles.coluna, dropTarget === stage.id ? styles.colunaSobreArraste : ""]
                .filter(Boolean)
                .join(" ")}
              onDragOver={(event) => {
                event.preventDefault();
                setDropTarget(stage.id);
              }}
              onDrop={(event) => {
                event.preventDefault();
                void dropOn(stage.id);
              }}
            >
              <div className={styles.colunaCabecalho}>
                {renamingStage === stage.id ? (
                  <form
                    className={styles.formRenomear}
                    onSubmit={(event) => {
                      event.preventDefault();
                      const formData = new FormData(event.currentTarget);
                      saveStageName(stage.id, String(formData.get("name") ?? ""));
                    }}
                  >
                    <Input
                      name="name"
                      size="sm"
                      defaultValue={stage.name}
                      autoFocus
                      onBlur={(event) => saveStageName(stage.id, event.currentTarget.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Escape") setRenamingStage(null);
                      }}
                    />
                  </form>
                ) : canManagePipeline ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={styles.colunaNome}
                    onClick={() => setRenamingStage(stage.id)}
                  >
                    {stage.name}
                  </Button>
                ) : <span className={styles.colunaNome}>{stage.name}</span>}
                <span className={styles.colunaTotal}>
                  {allStageDeals.length} · {formatBRL(total)}
                </span>
              </div>

              <div className={styles.listaCartoes}>
                {stageDeals.map((deal) => {
                  const isOpen = deal.status === "open";
                  return (
                    <article
                      key={deal.id}
                      className={[styles.cartao, dragging === deal.id ? styles.cartaoArrastando : ""]
                        .filter(Boolean)
                        .join(" ")}
                      draggable={isOpen && canMove}
                      data-draggable={isOpen && canMove ? "true" : undefined}
                      onDragStart={(event) => {
                        event.dataTransfer.effectAllowed = "move";
                        setDragging(deal.id);
                      }}
                      onDragEnd={() => {
                        setDragging(null);
                        setDropTarget(null);
                      }}
                      /* O cartão inteiro abre o negócio. Só o título era
                       * clicável, e num quadro cheio isso é mirar em duas
                       * palavras entre valor, pessoa, próximo passo e data —
                       * clicar no cartão parecia não fazer nada.
                       *
                       * O título continua sendo um link de verdade: é ele que
                       * o teclado alcança, que abre em nova aba e que o leitor
                       * de tela anuncia. Aqui só se acrescenta o alvo do
                       * mouse. Quem já tem comportamento próprio — o menu de
                       * ações — fica de fora, e texto selecionado também: quem
                       * acabou de marcar um valor para copiar não quer navegar
                       * ao soltar. */
                      onClick={(event) => {
                        const alvo = event.target;
                        if (alvo instanceof Element && alvo.closest("a, button, input, [role='menu']")) return;
                        if (window.getSelection()?.toString()) return;
                        void navigate(`/deals/${deal.id}`);
                      }}
                    >
                      <div className={styles.cartaoCabecalho}>
                        <Link className={styles.cartaoNome} to={`/deals/${deal.id}`}>{deal.name}</Link>
                        {isOpen && canMove && <MenuButton size="sm" variant="ghost" shape="rounded" iconOnly indicator={false} icon={<Icon name="more" />} aria-label={`Ações do negócio ${deal.name}`} disabled={busyDealId === deal.id} menu={<><MenuItem onClick={() => void closeDeal(deal, "won")}>Marcar como ganho</MenuItem><MenuItem onClick={() => { setLossReason(""); setClosingDeal(deal); }}>Marcar como perdido</MenuItem></>} />}
                      </div>
                      <span className={styles.cartaoValor}>{formatBRL(syncedAmount(deal.amount))}</span>
                      {(deal.contactId || deal.companyId) && <span className={styles.cartaoMeta}>{[deal.contactId ? contactNames.get(deal.contactId) ?? "Contato indisponível" : null, deal.companyId ? companyNames.get(deal.companyId) ?? "Empresa indisponível" : null].filter(Boolean).join(" · ")}</span>}
                      {canReadActivities && (() => {
                        const next = nextActivity.get(deal.id);
                        if (!isOpen) return null;
                        const overdue = next ? next.scheduledAt < new Date().toISOString() : false;
                        return <span className={styles.cartaoPasso} data-state={!next ? "none" : overdue ? "overdue" : "scheduled"}>
                          <span className={styles.cartaoPassoPonto} aria-hidden="true" />
                          {next ? `${overdue ? "Atrasada" : "Próxima"}: ${next.title}` : "Sem próximo passo"}
                        </span>;
                      })()}
                      {(deal.ownerId || deal.expectedCloseDate) && <span className={styles.cartaoRodape}>{deal.ownerId && <span className={styles.cartaoMeta}>{userNames.get(deal.ownerId) ?? "Usuário indisponível"}</span>}{deal.expectedCloseDate && <span className={styles.cartaoMeta}>{formatDate(deal.expectedCloseDate)}</span>}</span>}
                      {!isOpen && (
                        <span
                          className={[
                            styles.cartaoBadge,
                            deal.status === "won" ? styles.cartaoBadgeGanho : styles.cartaoBadgePerdido,
                          ].join(" ")}
                        >
                          {deal.status === "won" ? "Ganho" : "Perdido"}
                        </span>
                      )}
                    </article>
                  );
                })}
              </div>

              {stageDeals.length < allStageDeals.length && <Button variant="ghost" size="sm" onClick={() => setVisibleByStage((current) => ({ ...current, [stage.id]: visibleCount + 50 }))}>Mostrar mais {Math.min(50, allStageDeals.length - stageDeals.length)}</Button>}

              {canWrite && <Button variant="ghost" size="sm" onClick={() => openDealModal(stage.id)}>+ Adicionar negócio</Button>}
            </section>
          );
        })}

      </div>
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
      {dealModalOpen && <ActionModal open onOpenChange={(open) => { setDealModalOpen(open); if (!open) resetDealForm(); }} title="Novo negócio" confirmLabel="Criar negócio" errorText="Preencha nome, valor, pessoa e etapa para criar o negócio." onConfirm={addDeal}>
        <div className={styles.modalFields}>
          <Field><Label>Nome</Label><Input value={dealName} onChange={(event) => setDealName(event.target.value)} placeholder="Ex.: Contrato anual Acme" /></Field>
          <Field><Label>Valor</Label><MoneyInput label="Valor do negócio" value={dealAmount} onValueChange={setDealAmount} /></Field>
          <Field><Label>Pessoa</Label><SearchSelect label="Pessoa do negócio" searchPlacement="dropdown" placeholder="Selecionar pessoa" options={contacts.filter((contact) => !contact.deletedAt).map((contact) => ({ value: contact.id, label: contact.name, ...(contact.email ? { description: contact.email } : {}) }))} value={dealContact} onValueChange={setDealContact} /></Field>
          <Field><Label>Empresa</Label><Select label="Empresa do negócio" value={dealCompanyId || null} placeholder="Não vinculada" options={companies.filter((company) => !company.deletedAt).map((company) => ({ value: company.id, label: company.name }))} onValueChange={(value) => setDealCompanyId(value ?? "")} /></Field>
          <Field><Label>Responsável</Label><Select label="Responsável pelo negócio" value={dealOwnerId || null} placeholder="Não atribuído" options={users.filter((user) => !user.deactivatedAt).map(userSelectOption)} onValueChange={(value) => setDealOwnerId(value ?? "")} /></Field>
          <Field><Label>Etapa inicial</Label><Select label="Etapa inicial" value={targetStageId} options={stages.map((stage) => ({ value: stage.id, label: stage.name }))} onValueChange={setTargetStageId} /></Field>
          <Field><Label>Previsão de fechamento</Label><DatePicker label="Previsão de fechamento" value={expectedCloseDate} onValueChange={setExpectedCloseDate} /></Field>
        </div>
      </ActionModal>}
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
    <ModalContent title={`Editar ${pipeline.name}`} description="Etapas do funil, na ordem em que um negócio passa por elas">
      <ul className={styles.editorLista}>
        {orderedStages.map((stage) => (
          <li
            key={stage.id}
            className={[styles.editorLinha, dragging === stage.id ? styles.editorLinhaArrastando : ""].filter(Boolean).join(" ")}
            draggable
            onDragStart={() => setDragging(stage.id)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              if (!dragging || dragging === stage.id) return;
              const from = order.indexOf(dragging);
              const to = order.indexOf(stage.id);
              if (from === -1 || to === -1) return;
              const next = [...order];
              next.splice(from, 1);
              next.splice(to, 0, dragging);
              void commitReorder(next);
            }}
            onDragEnd={() => setDragging(null)}
          >
            <span className={styles.editorAlca} aria-hidden="true"><Icon name="menu" /></span>
            <span className={styles.editorNome}>{stage.name}</span>
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              icon={<Icon name="trash" />}
              aria-label={`Arquivar etapa ${stage.name}`}
              loading={busyStageId === stage.id}
              onClick={() => void archiveStage(stage)}
            />
          </li>
        ))}
        {orderedStages.length === 0 && <li className={styles.editorVazio}>Este funil ainda não tem etapa.</li>}
      </ul>
      <form className={styles.editorNovo} onSubmit={(event) => void addStage(event)}>
        <Field><Label>Nova etapa</Label><Input value={newStageName} onChange={(event) => setNewStageName(event.target.value)} placeholder="Ex.: Proposta enviada" /></Field>
        <Button type="submit" variant="secondary" loading={creating}>+ Etapa</Button>
      </form>
    </ModalContent>
  </Modal>;
}
