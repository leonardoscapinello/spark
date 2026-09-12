import { useState } from "react";
import { useLiveQuery } from "@tanstack/react-db";
import { useNavigate, useSearchParams } from "react-router";
import { optimisticAutomation } from "@spark/data";
import type { Automation } from "@spark/core";
import { ActionModal, Badge, Button, DataTable, EmptyState, Field, Input, Label, PageHeader, notify, type TableColumn } from "@spark/ui-web";
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
  const canWrite = session?.capabilities.includes("automations:write") ?? false;
  const firstRun = automations.length === 0 && !isLoading && !selectedStatus;
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

  return <div className={styles.page}>
    <PageHeader title={selectedStatus === "active" ? "Fluxos ativos" : selectedStatus === "draft" ? "Rascunhos" : selectedStatus === "paused" ? "Fluxos pausados" : "Automações"} description="Crie e acompanhe fluxos com vários gatilhos e etapas." actions={canWrite && !isLoading && !firstRun ? <Button onClick={() => setModalOpen(true)}>Nova automação</Button> : undefined} />
    {automations.length > 0 && <div className={styles.toolbar}><Input aria-label="Buscar automações" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar automação" /><span className={styles.count}>{visibleAutomations.length} {visibleAutomations.length === 1 ? "automação" : "automações"}</span></div>}
    {firstRun
      ? <EmptyState icon="bolt" title="Crie sua primeira automação" description="Desenhe gatilhos e etapas para acompanhar cada contato sem repetir tarefas manuais." action={canWrite ? <Button onClick={() => setModalOpen(true)}>Nova automação</Button> : undefined} />
      : <DataTable label="Lista de automações" rows={visibleAutomations} columns={columns} rowKey={(item) => item.id} rowLabel={(item) => item.name} state={isLoading && !automations.length ? "loading" : "ready"} emptyText={automations.length ? "Nenhum fluxo encontrado neste filtro." : "Nenhuma automação nesta situação."} actions={(item) => <Button variant="secondary" size="sm" onClick={() => navigate(`/automations/${item.id}`)}>{canWrite ? "Editar fluxo" : "Abrir fluxo"}</Button>} />}
    <ActionModal open={modalOpen} onOpenChange={setModalOpen} title="Nova automação" confirmLabel="Criar e abrir" errorText="Informe um nome para a automação." onConfirm={create}>
      <Field><Label>Nome</Label><Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Qualificar leads do Instagram" maxLength={160} /></Field>
    </ActionModal>
  </div>;
}

function statusLabel(status: "draft" | "active" | "paused"): string { return ({ draft: "Rascunho", active: "Ativa", paused: "Pausada" })[status]; }
function relativeTime(value: string): string { const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60_000)); return minutes < 1 ? "agora" : minutes < 60 ? `há ${minutes} min` : minutes < 1_440 ? `há ${Math.floor(minutes / 60)} h` : `há ${Math.floor(minutes / 1_440)} d`; }
