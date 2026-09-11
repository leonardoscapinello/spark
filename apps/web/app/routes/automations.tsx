import { useState } from "react";
import { useLiveQuery } from "@tanstack/react-db";
import { useNavigate } from "react-router";
import { optimisticAutomation } from "@spark/data";
import { ActionModal, Badge, Button, Card, Field, Input, Label, PageHeader, notify } from "@spark/ui-web";
import { getSession } from "../lib/auth.client";
import { getAutomationsCollection } from "../lib/automations-collections.client";
import { requireCapability } from "../lib/route-access.client";
import styles from "./automations.module.css";

export async function clientLoader() { await requireCapability("automations:read"); await getAutomationsCollection().preload(); return null; }

export default function Automations() {
  const navigate = useNavigate();
  const session = getSession();
  const collection = getAutomationsCollection();
  const { data: automations, isLoading } = useLiveQuery({ query: (q) => q.from({ automations: collection }).orderBy(({ automations: item }) => item.updatedAt, "desc") });
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const canWrite = session?.capabilities.includes("automations:write") ?? false;

  async function create() {
    if (!session || !name.trim()) throw new Error("MISSING_NAME");
    const automation = optimisticAutomation(name.trim(), session.orgId);
    await collection.insert(automation).isPersisted.promise;
    setName("");
    notify({ title: "Automação criada", description: "O rascunho está pronto para ser desenhado.", tone: "success" });
    navigate(`/automations/${automation.id}`);
  }

  return <div className={styles.page}>
    <PageHeader eyebrow="Operação" title="Automações" description="Crie fluxos visuais com múltiplos gatilhos, condições, esperas e ações." actions={canWrite ? <Button onClick={() => setModalOpen(true)}>Nova automação</Button> : undefined} />
    <section className={styles.summary}>
      <Card title="Fluxos"><strong>{automations.length}</strong></Card>
      <Card title="Ativos"><strong>{automations.filter((item) => item.status === "active").length}</strong></Card>
      <Card title="Rascunhos"><strong>{automations.filter((item) => item.status === "draft").length}</strong></Card>
      <Card title="Pausados"><strong>{automations.filter((item) => item.status === "paused").length}</strong></Card>
    </section>
    <section className={styles.list} aria-label="Lista de automações">
      <header><span>Nome</span><span>Estrutura</span><span>Versão</span><span>Status</span><span /></header>
      {isLoading && !automations.length && <p className={styles.empty}>Carregando automações…</p>}
      {!isLoading && !automations.length && <div className={styles.zero}><strong>Construa seu primeiro fluxo</strong><span>Escolha gatilhos e conecte cada etapa em um canvas visual.</span>{canWrite && <Button onClick={() => setModalOpen(true)}>Criar automação</Button>}</div>}
      {automations.map((automation) => <article key={automation.id}>
        <div><strong>{automation.name}</strong><small>Atualizada {relativeTime(automation.updatedAt)}</small></div>
        <span>{automation.draftGraph.nodes.length} blocos · {automation.draftGraph.edges.length} conexões</span>
        <span>{automation.publishedVersion ? `v${automation.publishedVersion}` : "Ainda não publicada"}</span>
        <Badge tone={automation.status === "active" ? "success" : automation.status === "paused" ? "warning" : "neutral"}>{statusLabel(automation.status)}</Badge>
        <Button variant="secondary" size="sm" onClick={() => navigate(`/automations/${automation.id}`)}>{canWrite ? "Editar fluxo" : "Abrir fluxo"}</Button>
      </article>)}
    </section>
    <ActionModal open={modalOpen} onOpenChange={setModalOpen} title="Nova automação" confirmLabel="Criar e abrir" errorText="Informe um nome para a automação." onConfirm={create}>
      <Field><Label>Nome</Label><Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Qualificar leads do Instagram" maxLength={160} /></Field>
    </ActionModal>
  </div>;
}

function statusLabel(status: "draft" | "active" | "paused"): string { return ({ draft: "Rascunho", active: "Ativa", paused: "Pausada" })[status]; }
function relativeTime(value: string): string { const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60_000)); return minutes < 1 ? "agora" : minutes < 60 ? `há ${minutes} min` : minutes < 1_440 ? `há ${Math.floor(minutes / 60)} h` : `há ${Math.floor(minutes / 1_440)} d`; }
