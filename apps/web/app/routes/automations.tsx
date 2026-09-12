import { useState } from "react";
import { useLiveQuery } from "@tanstack/react-db";
import { Link, useNavigate, useSearchParams } from "react-router";
import { optimisticAutomation } from "@spark/data";
import type { Automation } from "@spark/core";
import { ActionModal, Badge, Button, Card, CollectionToolbar, DataTable, EmptyState, Field, Icon, Input, Label, PageFrame, PageHeader, Skeleton, TableIconAction, ViewSwitcher, notify, type TableColumn } from "@spark/ui-web";
import { getSession } from "../lib/auth.client";
import { getAutomationsCollection } from "../lib/automations-collections.client";
import { requireCapability } from "../lib/route-access.client";
import styles from "./automations.module.css";

export async function clientLoader() { await requireCapability("automations:read"); void getAutomationsCollection().preload().catch(() => undefined); return null; }

export default function Automations() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedStatus = searchParams.get("filter");
  const session = getSession();
  const collection = getAutomationsCollection();
  const { data: automations, isLoading } = useLiveQuery({ query: (q) => q.from({ automations: collection }).orderBy(({ automations: item }) => item.updatedAt, "desc") });
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [search, setSearch] = useState("");
  const [layout, setLayout] = useState<"cards" | "table">("cards");
  const canWrite = session?.capabilities.includes("automations:write") ?? false;
  const firstRun = automations.length === 0 && !isLoading && !selectedStatus && !search;
  const normalizedSearch = search.trim().toLocaleLowerCase("pt-BR");
  const visibleAutomations = selectedStatus === "active" || selectedStatus === "draft" || selectedStatus === "paused"
    ? automations.filter((item) => item.status === selectedStatus && item.name.toLocaleLowerCase("pt-BR").includes(normalizedSearch))
    : automations.filter((item) => item.name.toLocaleLowerCase("pt-BR").includes(normalizedSearch));
  const columns: TableColumn<Automation>[] = [
    { id: "name", label: "Automação", cell: (item) => <div className={styles.primary}><strong>{item.name}</strong><small>Atualizada {relativeTime(item.updatedAt)}</small></div>, sortValue: (item) => item.name },
    { id: "structure", label: "Estrutura", cell: (item) => `${item.draftGraph.nodes.length} blocos · ${item.draftGraph.edges.length} conexões`, sortValue: (item) => item.draftGraph.nodes.length },
    { id: "version", label: "Versão", cell: (item) => item.publishedVersion ? `v${item.publishedVersion}` : "Ainda não publicada", sortValue: (item) => item.publishedVersion ?? 0 },
    { id: "status", label: "Situação", cell: (item) => <Badge tone={item.status === "active" ? "success" : item.status === "paused" ? "warning" : "neutral"}>{statusLabel(item.status)}</Badge>, sortValue: (item) => item.status },
  ];

  async function create() {
    if (!session || !name.trim()) throw new Error("MISSING_NAME");
    const automation = optimisticAutomation(name.trim(), session.orgId);
    await collection.insert(automation).isPersisted.promise;
    setName("");
    notify({ title: "Automação criada", description: "O rascunho está pronto para ser desenhado.", tone: "success" });
    navigate(`/automations/${automation.id}`);
  }

  return <PageFrame width="content">
    <PageHeader icon="bolt" title={selectedStatus === "active" ? "Fluxos ativos" : selectedStatus === "draft" ? "Rascunhos" : selectedStatus === "paused" ? "Fluxos pausados" : "Automações"} actions={canWrite && !isLoading && !firstRun ? <Button onClick={() => setModalOpen(true)}>Nova automação</Button> : undefined} />
    {firstRun && <EmptyState variant="featured" icon="bolt" title="Crie sua primeira automação" description="Comece por um gatilho, escolha o que deve acontecer e acompanhe cada execução no mesmo fluxo." action={canWrite ? <Button onClick={() => setModalOpen(true)}>Nova automação</Button> : undefined} />}
    <CollectionToolbar search={<Input aria-label="Buscar automações" startAdornment={<Icon name="search" />} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar automação" />} count={`${visibleAutomations.length} ${visibleAutomations.length === 1 ? "automação" : "automações"}`} actions={<ViewSwitcher label="Visualização das automações" value={layout} onValueChange={setLayout} />} />
    {layout === "table" ? <DataTable label="Lista de automações" rows={visibleAutomations} columns={columns} rowKey={(item) => item.id} rowLabel={(item) => item.name} state={isLoading && !automations.length ? "loading" : "ready"} emptyText={firstRun ? "As automações criadas aparecerão nesta lista." : automations.length ? "Nenhum fluxo encontrado neste filtro." : "Nenhuma automação nesta situação."} actions={(item) => <TableIconAction label={`${canWrite ? "Editar" : "Abrir"} ${item.name}`} icon={<Icon name="right" />} onClick={() => void navigate(`/automations/${item.id}`)} />} /> : <div className={styles.cardList} aria-label="Lista de automações">
      {isLoading && !automations.length && [0, 1, 2].map((item) => <Skeleton key={item} className={styles.cardLoading} />)}
      {!isLoading && visibleAutomations.length === 0 && <p className={styles.empty}>{automations.length ? "Nenhum fluxo encontrado neste filtro." : "Nenhuma automação nesta situação."}</p>}
      {visibleAutomations.map((item) => <Link key={item.id} to={`/automations/${item.id}`} className={styles.cardLink} aria-label={`Abrir automação ${item.name}`}><Card title={item.name} description={`Atualizada ${relativeTime(item.updatedAt)}`} actions={<Badge tone={item.status === "active" ? "success" : item.status === "paused" ? "warning" : "neutral"}>{statusLabel(item.status)}</Badge>}><div className={styles.cardMeta}><span><Icon name="bolt" />{item.draftGraph.nodes.filter((node) => node.type === "trigger").length} gatilhos</span><span>{item.draftGraph.nodes.length} blocos · {item.draftGraph.edges.length} conexões</span><span>{item.publishedVersion ? `Versão ${item.publishedVersion}` : "Não publicada"}</span></div></Card></Link>)}
    </div>}
    <ActionModal open={modalOpen} onOpenChange={setModalOpen} title="Nova automação" confirmLabel="Criar e abrir" errorText="Informe um nome para a automação." onConfirm={create}>
      <Field><Label>Nome</Label><Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Qualificar leads do Instagram" maxLength={160} /></Field>
    </ActionModal>
  </PageFrame>;
}

function statusLabel(status: "draft" | "active" | "paused"): string { return ({ draft: "Rascunho", active: "Ativa", paused: "Pausada" })[status]; }
function relativeTime(value: string): string { const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60_000)); return minutes < 1 ? "agora" : minutes < 60 ? `há ${minutes} min` : minutes < 1_440 ? `há ${Math.floor(minutes / 60)} h` : `há ${Math.floor(minutes / 1_440)} d`; }
