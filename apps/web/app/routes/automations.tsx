import { useMemo, useState } from "react";
import { useLiveQuery } from "@tanstack/react-db";
import { Link, useNavigate, useSearchParams } from "react-router";
import { optimisticAutomation } from "@spark/data";
import type { Automation } from "@spark/core";
import { ActionCard, ActionCardGroup, ActionModal, Button, Chip, CollectionToolbar, DataTable, EmptyState, Field, Input, Label, PageFrame, PageHeader, RecordIdentity, SearchField, SectionTitle, Select, Surface, Text, ViewSwitcher, notify, type TableColumn } from "@spark/ui-web";
import { getSession } from "../lib/auth.client";
import { getAutomationRunsCollection, getAutomationsCollection } from "../lib/automations-collections.client";
import { requireCapability } from "../lib/route-access.client";
import styles from "./automations.module.css";

export async function clientLoader() { await requireCapability("automations:read"); void Promise.allSettled([getAutomationsCollection().preload(), getAutomationRunsCollection().preload()]); return null; }

export default function Automations() {
  const navigate = useNavigate();
  // Regra do produto: a linha abre a página do registro; Cmd/Ctrl ou botão do meio abre em outra aba.
  const openRecord = (url: string, newTab: boolean) => { if (newTab) window.open(url, "_blank"); else void navigate(url); };
  const [searchParams] = useSearchParams();
  const selectedStatus = searchParams.get("filter");
  const session = getSession();
  const collection = getAutomationsCollection();
  const { data: automations, isLoading } = useLiveQuery({ query: (q) => q.from({ automations: collection }).orderBy(({ automations: item }) => item.updatedAt, "desc") });
  const { data: runs = [] } = useLiveQuery({ query: (q) => q.from({ runs: getAutomationRunsCollection() }) });
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [search, setSearch] = useState("");
  const [triggerFilter, setTriggerFilter] = useState("all");
  const [layout, setLayout] = useState<"cards" | "table">("cards");
  const canWrite = session?.capabilities.includes("automations:write") ?? false;
  const canReadContacts = session?.capabilities.includes("contacts:read") ?? false;
  const canReadIntegrations = session?.capabilities.includes("integrations:read") ?? false;
  const firstRun = automations.length === 0 && !isLoading && !selectedStatus && !search;
  const initialLoad = automations.length === 0 && isLoading;
  const normalizedSearch = search.trim().toLocaleLowerCase("pt-BR");
  const triggerOptions = [...new Set(automations.flatMap((item) => item.draftGraph.nodes.filter((node) => node.type === "trigger").map((node) => node.data.label)))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const runCounts = useMemo(() => runs.reduce((counts, run) => counts.set(run.automationId, (counts.get(run.automationId) ?? 0) + 1), new Map<string, number>()), [runs]);
  const visibleAutomations = selectedStatus === "active" || selectedStatus === "draft" || selectedStatus === "paused"
    ? automations.filter((item) => item.status === selectedStatus && item.name.toLocaleLowerCase("pt-BR").includes(normalizedSearch) && (triggerFilter === "all" || item.draftGraph.nodes.some((node) => node.type === "trigger" && node.data.label === triggerFilter)))
    : automations.filter((item) => item.name.toLocaleLowerCase("pt-BR").includes(normalizedSearch) && (triggerFilter === "all" || item.draftGraph.nodes.some((node) => node.type === "trigger" && node.data.label === triggerFilter)));
  const columns: TableColumn<Automation>[] = [
    { id: "name", label: "Automação", cell: (item) => <RecordIdentity icon="bolt" title={item.name} subtitle={`Atualizada ${relativeTime(item.updatedAt)}`} />, sortValue: (item) => item.name },
    { id: "trigger", label: "Gatilho", cell: (item) => <AutomationTriggers automation={item} />, sortValue: (item) => item.draftGraph.nodes.find((node) => node.type === "trigger")?.data.label ?? "" },
    { id: "runs", label: "Execuções", cell: (item) => formatCount(runCounts.get(item.id) ?? 0), sortValue: (item) => runCounts.get(item.id) ?? 0, align: "end" },
    { id: "structure", label: "Estrutura", cell: (item) => `${item.draftGraph.nodes.length} blocos · ${item.draftGraph.edges.length} conexões`, sortValue: (item) => item.draftGraph.nodes.length },
    { id: "version", label: "Versão", cell: (item) => item.publishedVersion ? `v${item.publishedVersion}` : "Ainda não publicada", sortValue: (item) => item.publishedVersion ?? 0 },
    { id: "status", label: "Situação", cell: (item) => <Chip dot={STATUS_DOT[item.status]}>{statusLabel(item.status)}</Chip>, sortValue: (item) => item.status },
  ];

  async function create() {
    if (!session || !name.trim()) throw new Error("MISSING_NAME");
    const automation = optimisticAutomation(name.trim(), session.orgId);
    await collection.insert(automation).isPersisted.promise;
    setName("");
    notify({ title: "Automação criada", description: "O rascunho está pronto para ser desenhado.", tone: "success" });
    navigate(`/automations/${automation.id}`);
  }

  return <PageFrame>
    <PageHeader title={selectedStatus === "active" ? "Fluxos ativos" : selectedStatus === "draft" ? "Rascunhos" : selectedStatus === "paused" ? "Fluxos pausados" : "Automações"} actions={canWrite && !isLoading && !firstRun ? <Button onClick={() => setModalOpen(true)}>Nova automação</Button> : undefined} />
    {firstRun && <EmptyState variant="featured" icon="bolt" title="Crie sua primeira automação" description="Comece por um gatilho, escolha o que deve acontecer e acompanhe cada execução no mesmo fluxo." action={canWrite ? <Button onClick={() => setModalOpen(true)}>Nova automação</Button> : undefined} />}
    {firstRun && (canReadContacts || canReadIntegrations) && <ActionCardGroup title="Prepare seu primeiro fluxo">
      {canReadContacts && <ActionCard icon="team" title="Veja suas pessoas" description="Encontre as pessoas que poderão entrar nos seus fluxos." action={<Button variant="secondary" onClick={() => void navigate("/")}>Abrir pessoas</Button>} />}
      {canReadIntegrations && <ActionCard icon="message" title="Conecte canais" description="Prepare os canais que vão iniciar ou receber mensagens." action={<Button variant="secondary" onClick={() => void navigate("/integrations")}>Abrir integrações</Button>} />}
    </ActionCardGroup>}
    {!firstRun && <><CollectionToolbar search={<SearchField label="Buscar automações" value={search} onValueChange={setSearch} placeholder="Buscar automação" />} filters={<Select appearance="filter" label="Filtrar automações por gatilho" value={triggerFilter} options={[{ value: "all", label: "Qualquer gatilho" }, ...triggerOptions.map((label) => ({ value: label, label }))]} onValueChange={(value) => setTriggerFilter(value ?? "all")} />} count={initialLoad ? "Carregando…" : `${visibleAutomations.length} ${visibleAutomations.length === 1 ? "automação" : "automações"}`} actions={<ViewSwitcher label="Visualização das automações" value={layout} onValueChange={setLayout} />} />
    {initialLoad || layout === "table" ? <DataTable label="Lista de automações" rows={visibleAutomations} columns={columns} rowKey={(item) => item.id} rowLabel={(item) => item.name} state={isLoading && !automations.length ? "loading" : "ready"} emptyText={automations.length ? "Nenhum fluxo encontrado neste filtro." : "Nenhuma automação nesta situação."} onRowOpen={(item, { newTab }) => openRecord(`/automations/${item.id}`, newTab)} /> : <div className={styles.cardList} aria-label="Lista de automações">
      {!isLoading && visibleAutomations.length === 0 && !firstRun && <EmptyState icon="search" title="Nenhum fluxo encontrado" description={automations.length ? "Nenhum fluxo corresponde a este filtro." : "Nenhuma automação nesta situação."} />}
      {visibleAutomations.map((item) => <Surface key={item.id} as={Link} to={`/automations/${item.id}`} interactive className={styles.card} aria-label={`Abrir automação ${item.name}`}>
        <div className={styles.cardHead}><SectionTitle level="card" description={`Atualizada ${relativeTime(item.updatedAt)}`}>{item.name}</SectionTitle><Chip dot={STATUS_DOT[item.status]}>{statusLabel(item.status)}</Chip></div>
        <div className={styles.cardBody}><AutomationTriggers automation={item} /><div className={styles.cardMeta}><Text weight="medium" mono>{formatCount(runCounts.get(item.id) ?? 0)} execuções</Text><Text size="pequeno" tone="secondary">{item.draftGraph.nodes.length} blocos · {item.draftGraph.edges.length} conexões</Text><Text size="pequeno" tone="secondary">{item.publishedVersion ? `Versão ${item.publishedVersion}` : "Não publicada"}</Text></div></div>
      </Surface>)}
    </div>}</>}
    <ActionModal open={modalOpen} onOpenChange={setModalOpen} title="Nova automação" confirmLabel="Criar e abrir" errorText="Informe um nome para a automação." onConfirm={create}>
      <Field><Label>Nome</Label><Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Qualificar leads do Instagram" maxLength={160} /></Field>
    </ActionModal>
  </PageFrame>;
}

function AutomationTriggers({ automation }: { automation: Automation }) {
  const triggers = automation.draftGraph.nodes.filter((node) => node.type === "trigger");
  return <div className={styles.triggers}>{triggers.length ? <>{triggers.slice(0, 2).map((node) => <Chip key={node.id} icon="bolt">{node.data.label}</Chip>)}{triggers.length > 2 && <Chip>+{triggers.length - 2} gatilhos</Chip>}</> : <Text size="pequeno" tone="muted">Nenhum gatilho configurado</Text>}</div>;
}

/** Situação num ponto de cor; a etiqueta fica neutra. */
const STATUS_DOT = { draft: "var(--tx3)", active: "var(--ok)", paused: "var(--wa)" } as const;
function statusLabel(status: "draft" | "active" | "paused"): string { return ({ draft: "Rascunho", active: "Ativa", paused: "Pausada" })[status]; }
function relativeTime(value: string): string { const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60_000)); return minutes < 1 ? "agora" : minutes < 60 ? `há ${minutes} min` : minutes < 1_440 ? `há ${Math.floor(minutes / 60)} h` : `há ${Math.floor(minutes / 1_440)} d`; }
function formatCount(value: number): string { return new Intl.NumberFormat("pt-BR").format(value); }
