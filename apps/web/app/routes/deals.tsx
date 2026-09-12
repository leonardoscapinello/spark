import { type FormEvent, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { useLiveQuery } from "@tanstack/react-db";
import { sum, formatBRL, companyId as companyIdFactory, contactId as contactIdFactory, userId as userIdFactory, type Deal, type Money, type StageId, type DealStatus } from "@spark/core";
import { optimisticPipeline, optimisticStage, optimisticDeal, forInsert, syncedAmount } from "@spark/data";
import { ActionModal, Button, CollectionToolbar, DatePicker, EmptyState, Field, Input, Label, MoneyInput, PageHeader, SearchSelect, Select, Skeleton, Textarea, notify, type SelectOption } from "@spark/ui-web";
import { getSession } from "../lib/auth.client";
import { getPipelinesCollection, getStagesCollection, getDealsCollection } from "../lib/deals-collections.client";
import { getContactsCollection } from "../lib/contacts-collection.client";
import { getUsersCollection } from "../lib/users-collection.client";
import { getCompaniesCollection } from "../lib/companies-collection.client";
import { requireCapability } from "../lib/route-access.client";
import styles from "./deals.module.css";

export async function clientLoader() {
  const session = await requireCapability("deals:read");
  void Promise.allSettled([
    getPipelinesCollection().preload(),
    getStagesCollection().preload(),
    getDealsCollection().preload(),
    getUsersCollection().preload(),
    ...(session.capabilities.includes("contacts:read") ? [getContactsCollection().preload()] : []),
    ...(session.capabilities.includes("companies:read") ? [getCompaniesCollection().preload()] : []),
  ]);
  return null;
}

export default function Deals() {
  const [searchParams, setSearchParams] = useSearchParams();
  const pipelinesCollection = getPipelinesCollection();
  const stagesCollection = getStagesCollection();
  const dealsCollection = getDealsCollection();
  const contactsCollection = getContactsCollection();
  const usersCollection = getUsersCollection();
  const companiesCollection = getCompaniesCollection();

  const { data: pipelines, isLoading: isLoadingPipelines } = useLiveQuery({
    query: (q) => q.from({ pipelines: pipelinesCollection }),
  });
  const { data: allStages } = useLiveQuery({
    query: (q) => q.from({ stages: stagesCollection }).orderBy(({ stages: s }) => s.sortOrder, "asc"),
  });
  const { data: allDeals } = useLiveQuery({ query: (q) => q.from({ deals: dealsCollection }) });
  const session = getSession();
  const canReadContacts = session?.capabilities.includes("contacts:read") ?? false;
  const canReadCompanies = session?.capabilities.includes("companies:read") ?? false;
  const { data: contacts = [] } = useLiveQuery({ query: (q) => canReadContacts ? q.from({ contacts: contactsCollection }).orderBy(({ contacts: contact }) => contact.name, "asc") : undefined });
  const { data: users } = useLiveQuery({ query: (q) => q.from({ users: usersCollection }).orderBy(({ users: user }) => user.name, "asc") });
  const { data: companies = [] } = useLiveQuery({ query: (q) => canReadCompanies ? q.from({ companies: companiesCollection }).orderBy(({ companies: company }) => company.name, "asc") : undefined });

  const [dragging, setDragging] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [renamingStage, setRenamingStage] = useState<string | null>(null);
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null);
  const [pipelineModalOpen, setPipelineModalOpen] = useState(false);
  const [pipelineName, setPipelineName] = useState("");
  const statusFilter = searchParams.get("status") ?? "open";
  const [dealModalOpen, setDealModalOpen] = useState(false);
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

  const mainPipeline = pipelines.find((pipeline) => pipeline.id === selectedPipelineId) ?? pipelines.find((pipeline) => pipeline.isDefault) ?? pipelines[0];
  const stages = mainPipeline ? allStages.filter((s) => s.pipelineId === mainPipeline.id) : [];
  const deals = mainPipeline ? allDeals.filter((deal) => deal.pipelineId === mainPipeline.id && !deal.deletedAt && (statusFilter === "all" || deal.status === statusFilter)) : [];
  const contactNames = new Map(contacts.map((contact) => [contact.id, contact.name]));
  const userNames = new Map(users.map((user) => [user.id, user.name]));
  const companyNames = new Map(companies.map((company) => [company.id, company.name]));
  const canWrite = session?.capabilities.includes("deals:write") ?? false;
  const canMove = session?.capabilities.includes("deals:move") ?? false;
  const canManagePipeline = session?.capabilities.includes("pipelines:manage") ?? false;

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
    if (!session || !mainPipeline || !targetStageId || !dealName.trim() || dealAmount === null) throw new Error("MISSING_FIELDS");
    const deal = optimisticDeal({
      pipelineId: mainPipeline.id,
      stageId: targetStageId as StageId,
      contactId: dealContact ? contactIdFactory.from(dealContact.value) : null,
      companyId: dealCompanyId ? companyIdFactory.from(dealCompanyId) : null,
      ownerId: dealOwnerId ? userIdFactory.from(dealOwnerId) : null,
      name: dealName.trim(),
      amount: dealAmount,
      expectedCloseDate: expectedCloseDate || null,
    }, session.orgId);
    const transaction = dealsCollection.insert(forInsert(deal));
    await transaction.isPersisted.promise;
    notify({ title: "Negócio criado", description: deal.name, tone: "success" });
    resetDealForm();
  }

  async function dropOn(stageId: string) {
    if (dragging) {
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

  function addStage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const session = getSession();
    if (!session || !mainPipeline) return;

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("stageName") ?? "").trim();
    if (!name) return;

    const stage = optimisticStage({ pipelineId: mainPipeline.id, name, sortOrder: stages.length }, session.orgId);
    stagesCollection.insert(stage);
    event.currentTarget.reset();
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
      <div className={styles.pagina}>
        <PageHeader icon="briefcase" title="Negócios" />
        {isLoadingPipelines
          ? <div className={styles.board} role="status" aria-label="Carregando funis">{[0, 1, 2].map((column) => <div key={column} className={styles.coluna}><Skeleton className={styles.loadingTitle} /><Skeleton className={styles.loadingValue} /><Skeleton className={styles.loadingCard} /><Skeleton className={styles.loadingCard} /></div>)}</div>
          : <EmptyState variant="featured" icon="briefcase" title="Organize seu primeiro funil" description="Defina as etapas da venda para acompanhar cada oportunidade e o valor da negociação." action={canManagePipeline ? <Button onClick={() => { setPipelineName("Funil de Vendas"); setPipelineModalOpen(true); }}>Criar funil</Button> : undefined} />}
        <ActionModal open={pipelineModalOpen} onOpenChange={setPipelineModalOpen} title="Novo funil" confirmLabel="Criar funil" errorText="Informe um nome para o funil." onConfirm={createPipeline}>
          <Field><Label>Nome do funil</Label><Input value={pipelineName} onChange={(event) => setPipelineName(event.target.value)} placeholder="Ex.: Vendas consultivas" /></Field>
        </ActionModal>
      </div>
    );
  }

  return (
    <div className={styles.pagina}>
      <PageHeader icon="briefcase" title="Negócios" actions={<>{canManagePipeline && <Button variant="secondary" onClick={() => { setPipelineName(""); setPipelineModalOpen(true); }}>Novo funil</Button>}{canWrite && <Button onClick={() => openDealModal()}>Novo negócio</Button>}</>} />
      <div className={styles.toolbar}><CollectionToolbar filters={<>
        <Select appearance="filter" label="Funil" value={mainPipeline?.id ?? null} options={pipelines.map((pipeline) => ({ value: pipeline.id, label: pipeline.name }))} onValueChange={(value) => setSelectedPipelineId(value)} />
        <Select appearance="filter" label="Situação dos negócios" value={statusFilter} options={[{ value: "open", label: "Em aberto" }, { value: "won", label: "Ganhos" }, { value: "lost", label: "Perdidos" }, { value: "all", label: "Todos" }]} onValueChange={(value) => setSearchParams(value && value !== "open" ? { status: value } : {})} />
      </>} /></div>

      <div className={styles.board}>
        {stages.map((stage) => {
          const stageDeals = deals.filter((d) => d.stageId === stage.id);
          const total = sum(stageDeals.map((d) => syncedAmount(d.amount)));

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
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={styles.colunaNome}
                    onClick={() => setRenamingStage(stage.id)}
                  >
                    {stage.name}
                  </Button>
                )}
                <span className={styles.colunaTotal}>
                  {stageDeals.length} · {formatBRL(total)}
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
                      onDragStart={(event) => {
                        event.dataTransfer.effectAllowed = "move";
                        setDragging(deal.id);
                      }}
                      onDragEnd={() => {
                        setDragging(null);
                        setDropTarget(null);
                      }}
                    >
                      <Link className={styles.cartaoNome} to={`/deals/${deal.id}`}>{deal.name}</Link>
                      <span className={styles.cartaoValor}>{formatBRL(syncedAmount(deal.amount))}</span>
                      {deal.contactId && <span className={styles.cartaoMeta}>{contactNames.get(deal.contactId) ?? "Contato indisponível"}</span>}
                      {deal.companyId && <span className={styles.cartaoMeta}>{companyNames.get(deal.companyId) ?? "Empresa indisponível"}</span>}
                      {deal.ownerId && <span className={styles.cartaoMeta}>Responsável: {userNames.get(deal.ownerId) ?? "Usuário indisponível"}</span>}
                      {deal.expectedCloseDate && <span className={styles.cartaoMeta}>Previsão: {formatDate(deal.expectedCloseDate)}</span>}
                      {isOpen ? (
                        <div className={styles.cartaoAcoes}>
                          <Button variant="ghost" size="sm" loading={busyDealId === deal.id} disabled={!canMove} onClick={() => void closeDeal(deal, "won")}>
                            Ganho
                          </Button>
                          <Button variant="ghost" size="sm" disabled={!canMove || busyDealId === deal.id} onClick={() => { setLossReason(""); setClosingDeal(deal); }}>
                            Perdido
                          </Button>
                        </div>
                      ) : (
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

              {canWrite && <Button variant="ghost" size="sm" onClick={() => openDealModal(stage.id)}>+ Adicionar negócio</Button>}
            </section>
          );
        })}

        {canManagePipeline && <form className={styles.colunaNova} onSubmit={addStage}>
          <Field>
            <Label>Novo estágio</Label>
            <Input name="stageName" placeholder="Nome do estágio" size="sm" />
          </Field>
          <Button type="submit" size="sm" variant="secondary">
            + Estágio
          </Button>
        </form>}
      </div>
      <ActionModal open={pipelineModalOpen} onOpenChange={setPipelineModalOpen} title="Novo funil" confirmLabel="Criar funil" errorText="Informe um nome para o funil." onConfirm={createPipeline}>
        <Field><Label>Nome do funil</Label><Input value={pipelineName} onChange={(event) => setPipelineName(event.target.value)} placeholder="Ex.: Vendas consultivas" /></Field>
      </ActionModal>
      <ActionModal open={dealModalOpen} onOpenChange={(open) => { setDealModalOpen(open); if (!open) resetDealForm(); }} title="Novo negócio" confirmLabel="Criar negócio" errorText="Preencha nome, valor e etapa para criar o negócio." onConfirm={addDeal}>
        <div className={styles.modalFields}>
          <Field><Label>Nome</Label><Input value={dealName} onChange={(event) => setDealName(event.target.value)} placeholder="Ex.: Contrato anual Acme" /></Field>
          <Field><Label>Valor</Label><MoneyInput label="Valor do negócio" value={dealAmount} onValueChange={setDealAmount} /></Field>
          <Field><Label>Contato</Label><SearchSelect label="Contato do negócio" searchPlacement="dropdown" placeholder="Selecionar contato" options={contacts.filter((contact) => !contact.deletedAt).map((contact) => ({ value: contact.id, label: contact.name, ...(contact.email ? { description: contact.email } : {}) }))} value={dealContact} onValueChange={setDealContact} /></Field>
          <Field><Label>Empresa</Label><Select label="Empresa do negócio" value={dealCompanyId || null} placeholder="Não vinculada" options={companies.filter((company) => !company.deletedAt).map((company) => ({ value: company.id, label: company.name }))} onValueChange={(value) => setDealCompanyId(value ?? "")} /></Field>
          <Field><Label>Responsável</Label><Select label="Responsável pelo negócio" value={dealOwnerId || null} placeholder="Não atribuído" options={users.filter((user) => !user.deactivatedAt).map((user) => ({ value: user.id, label: user.name, avatar: user.avatarUrl }))} onValueChange={(value) => setDealOwnerId(value ?? "")} /></Field>
          <Field><Label>Etapa inicial</Label><Select label="Etapa inicial" value={targetStageId} options={stages.map((stage) => ({ value: stage.id, label: stage.name }))} onValueChange={setTargetStageId} /></Field>
          <Field><Label>Previsão de fechamento</Label><DatePicker label="Previsão de fechamento" value={expectedCloseDate} onValueChange={setExpectedCloseDate} /></Field>
        </div>
      </ActionModal>
      <ActionModal open={closingDeal !== null} onOpenChange={(open) => { if (!open) { setClosingDeal(null); setLossReason(""); } }} title="Marcar negócio como perdido" confirmLabel="Confirmar perda" errorText="Não foi possível fechar o negócio." onConfirm={async () => { if (!closingDeal) return; const closed = await closeDeal(closingDeal, "lost", lossReason); if (!closed) throw new Error("CLOSE_FAILED"); setClosingDeal(null); }}>
        <Field><Label>Motivo da perda</Label><Textarea value={lossReason} onChange={(event) => setLossReason(event.target.value)} placeholder="O que impediu o fechamento?" /></Field>
      </ActionModal>
    </div>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(value));
}
