import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { useNavigate, useParams } from "react-router";
import { automationsControllerPublish, automationsControllerRun } from "@spark/api-client";
import { validateAutomationGraph, type AutomationEdge, type AutomationGraph, type AutomationNode, type AutomationNodeType } from "@spark/core";
import { ActionModal, Badge, Button, Field, Input, Label, PageHeader, SearchSelect, Select, Textarea, notify, type SelectOption } from "@spark/ui-web";
import { getSession } from "../lib/auth.client";
import { getAutomationRunsCollection, getAutomationRunStepsCollection, getAutomationVersionsCollection, getAutomationsCollection } from "../lib/automations-collections.client";
import { getContactsCollection } from "../lib/contacts-collection.client";
import { requireCapability } from "../lib/route-access.client";
import styles from "./automation-builder.module.css";

const NODE_DEFAULTS: Record<AutomationNodeType, { label: string; description: string }> = {
  trigger: { label: "Novo gatilho", description: "Define quando o fluxo começa" },
  action: { label: "Nova ação", description: "Executa uma tarefa" },
  condition: { label: "Nova condição", description: "Divide o caminho por uma regra" },
  wait: { label: "Nova espera", description: "Aguarda um período ou evento" },
};

export async function clientLoader() { const session = await requireCapability("automations:read"); void Promise.allSettled([getAutomationsCollection().preload(), getAutomationVersionsCollection().preload(), getAutomationRunsCollection().preload(), getAutomationRunStepsCollection().preload(), ...(session.capabilities.includes("contacts:read") ? [getContactsCollection().preload()] : [])]); return null; }

export default function AutomationBuilder() {
  const navigate = useNavigate();
  const { automationId } = useParams();
  const session = getSession();
  const collection = getAutomationsCollection();
  const { data: automations } = useLiveQuery({ query: (q) => q.from({ automations: collection }) });
  const { data: runs = [] } = useLiveQuery({ query: (q) => automationId ? q.from({ runs: getAutomationRunsCollection() }).where(({ runs: run }) => eq(run.automationId, automationId)).orderBy(({ runs: run }) => run.startedAt, "desc") : undefined });
  const canReadContacts = session?.capabilities.includes("contacts:read") ?? false;
  const { data: contacts = [] } = useLiveQuery({ query: (q) => canReadContacts ? q.from({ contacts: getContactsCollection() }).orderBy(({ contacts: contact }) => contact.name, "asc") : undefined });
  const automation = automations.find((item) => item.id === automationId) ?? null;
  const [name, setName] = useState("");
  const [graph, setGraph] = useState<AutomationGraph>({ nodes: [], edges: [] });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [runModalOpen, setRunModalOpen] = useState(false);
  const [runContact, setRunContact] = useState<SelectOption | null>(null);
  const hydratedId = useRef<string | null>(null);
  const drag = useRef<{ id: string; startX: number; startY: number; originX: number; originY: number } | null>(null);
  const canWrite = session?.capabilities.includes("automations:write") ?? false;
  const canPublish = session?.capabilities.includes("automations:publish") ?? false;

  useEffect(() => {
    if (automation && hydratedId.current !== automation.id) {
      hydratedId.current = automation.id;
      setName(automation.name);
      setGraph(automation.draftGraph);
    }
  }, [automation]);

  useEffect(() => {
    function move(event: PointerEvent) {
      const current = drag.current;
      if (!current) return;
      setGraph((value) => ({ ...value, nodes: value.nodes.map((node) => node.id === current.id ? { ...node, position: { x: Math.max(0, current.originX + event.clientX - current.startX), y: Math.max(0, current.originY + event.clientY - current.startY) } } : node) }));
    }
    function end() { drag.current = null; }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", end); };
  }, []);

  const selected = graph.nodes.find((node) => node.id === selectedId) ?? null;
  const issues = useMemo(() => validateAutomationGraph(graph), [graph]);

  function addNode(type: AutomationNodeType) {
    const id = `${type}-${crypto.randomUUID()}`;
    const count = graph.nodes.length;
    const node: AutomationNode = { id, type, position: { x: 56 + (count % 3) * 292, y: 64 + Math.floor(count / 3) * 184 }, data: { ...NODE_DEFAULTS[type], config: {} } };
    setGraph((value) => ({ ...value, nodes: [...value.nodes, node] }));
    setSelectedId(id);
  }

  function startDrag(event: ReactPointerEvent, node: AutomationNode) {
    if (!canWrite) return;
    event.preventDefault();
    setSelectedId(node.id);
    drag.current = { id: node.id, startX: event.clientX, startY: event.clientY, originX: node.position.x, originY: node.position.y };
  }

  function connect(targetId: string) {
    if (!connectingFrom) { setConnectingFrom(targetId); return; }
    if (connectingFrom === targetId) { setConnectingFrom(null); return; }
    const exists = graph.edges.some((edge) => edge.source === connectingFrom && edge.target === targetId);
    if (!exists) setGraph((value) => {
      const source = value.nodes.find((node) => node.id === connectingFrom);
      const branchCount = value.edges.filter((edge) => edge.source === connectingFrom).length;
      const label = source?.type === "condition" ? (branchCount === 0 ? "sim" : "não") : undefined;
      return { ...value, edges: [...value.edges, { id: `edge-${crypto.randomUUID()}`, source: connectingFrom, target: targetId, ...(label ? { label } : {}) }] };
    });
    setConnectingFrom(null);
  }

  function updateSelected(data: Partial<AutomationNode["data"]>) {
    if (!selectedId) return;
    setGraph((value) => ({ ...value, nodes: value.nodes.map((node) => node.id === selectedId ? { ...node, data: { ...node.data, ...data } } : node) }));
  }

  function removeSelected() {
    if (!selectedId) return;
    setGraph((value) => ({ nodes: value.nodes.filter((node) => node.id !== selectedId), edges: value.edges.filter((edge) => edge.source !== selectedId && edge.target !== selectedId) }));
    setSelectedId(null);
    setConnectingFrom(null);
  }

  async function saveDraft() {
    if (!automation || !canWrite || saving) return;
    setSaving(true);
    try {
      await collection.update(automation.id, (draft) => { draft.name = name.trim() || automation.name; draft.draftGraph = graph; }).isPersisted.promise;
      notify({ title: "Rascunho salvo", description: `${graph.nodes.length} blocos sincronizados.`, tone: "success" });
    } catch { notify({ title: "Não foi possível salvar", tone: "error" }); }
    finally { setSaving(false); }
  }

  async function publish() {
    if (!automation || saving) return;
    if (issues.length) { notify({ title: "Fluxo incompleto", description: issues[0]?.message ?? "Revise as conexões do fluxo.", tone: "warning" }); return; }
    setSaving(true);
    try {
      await collection.update(automation.id, (draft) => { draft.name = name.trim() || automation.name; draft.draftGraph = graph; }).isPersisted.promise;
      const result = await automationsControllerPublish(automation.id, {});
      notify({ title: `Versão ${result.version.version} publicada`, description: "Novas execuções usarão esta versão imutável.", tone: "success" });
    } catch { notify({ title: "Não foi possível publicar", description: "Atualize o rascunho e tente novamente.", tone: "error" }); }
    finally { setSaving(false); }
  }

  async function startRun() {
    if (!automation || !runContact) throw new Error("MISSING_CONTACT");
    const response = await automationsControllerRun(automation.id, { contactId: runContact.value, context: { source: "manual" } });
    notify({ title: "Execução iniciada", description: `Run ${response.run.id.slice(0, 8)} entrou na fila.`, tone: "success" });
    setRunContact(null);
  }

  if (!automation) return <div className={styles.loading}>Carregando automação…</div>;

  return <div className={styles.page}>
    <PageHeader eyebrow="Automações" title={automation.name} description="Arraste os blocos, conecte o caminho e publique quando o fluxo estiver completo." actions={<div className={styles.headerActions}><Button variant="ghost" onClick={() => navigate("/automations")}>Voltar</Button>{canWrite && automation.status === "active" && canReadContacts && <Button variant="secondary" onClick={() => setRunModalOpen(true)}>Executar agora</Button>}{canWrite && <Button variant="secondary" loading={saving} onClick={() => void saveDraft()}>Salvar rascunho</Button>}{canPublish && <Button disabled={Boolean(issues.length)} loading={saving} onClick={() => void publish()}>Publicar</Button>}</div>} />
    <section className={styles.runBar} aria-label="Execuções recentes"><div><strong>Execuções recentes</strong><span>{runs.length ? `${runs.length} registradas nesta automação` : "Nenhuma execução iniciada"}</span></div><div className={styles.runList}>{runs.slice(0, 5).map((run) => <span key={run.id}><Badge tone={run.status === "completed" ? "success" : run.status === "failed" ? "danger" : run.status === "waiting" ? "warning" : "neutral"}>{runStatusLabel(run.status)}</Badge><small>{new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(run.startedAt))}</small></span>)}</div></section>
    <div className={styles.workspace}>
      <aside className={styles.palette}>
        <header><strong>Blocos</strong><span>Adicione ao canvas</span></header>
        {(["trigger", "action", "condition", "wait"] as const).map((type) => <Button key={type} variant="secondary" className={styles.paletteButton} disabled={!canWrite} onClick={() => addNode(type)}><span className={styles.nodeMark} data-type={type} /> <span><strong>{typeLabel(type)}</strong><small>{NODE_DEFAULTS[type].description}</small></span></Button>)}
        <div className={styles.validation}><strong>Pronto para publicar</strong>{issues.length ? issues.map((issue) => <span key={`${issue.code}-${issue.nodeId ?? issue.edgeId ?? "graph"}`}>{issue.message}</span>) : <span data-valid="true">Fluxo válido e conectado.</span>}</div>
      </aside>
      <main className={styles.canvas} onPointerDown={() => setSelectedId(null)}>
        <svg className={styles.edges} aria-hidden="true">{graph.edges.map((edge) => <EdgeLine key={edge.id} edge={edge} nodes={graph.nodes} />)}</svg>
        {graph.nodes.length === 0 && <div className={styles.canvasEmpty}><strong>O fluxo começa com um gatilho</strong><span>Adicione um bloco pelo painel à esquerda.</span><Button disabled={!canWrite} onClick={(event) => { event.stopPropagation(); addNode("trigger"); }}>Adicionar gatilho</Button></div>}
        {graph.nodes.map((node) => <article key={node.id} className={styles.node} data-type={node.type} data-selected={selectedId === node.id || undefined} style={{ transform: `translate(${node.position.x}px, ${node.position.y}px)` }} onPointerDown={(event) => { event.stopPropagation(); startDrag(event, node); }}>
          <header><span className={styles.nodeMark} data-type={node.type} /><small>{typeLabel(node.type)}</small></header>
          <strong>{node.data.label}</strong><p>{node.data.description || "Sem descrição"}</p>
          {canWrite && <footer><Button size="sm" variant={connectingFrom === node.id ? "raised" : "ghost"} onPointerDown={(event) => event.stopPropagation()} onClick={() => connect(node.id)}>{connectingFrom && connectingFrom !== node.id ? "Ligar aqui" : connectingFrom === node.id ? "Cancelar" : "Conectar"}</Button></footer>}
        </article>)}
      </main>
      <aside className={styles.inspector}>
        {selected ? <><header><div><Badge tone="neutral">{typeLabel(selected.type)}</Badge><strong>Configuração</strong></div><Button iconOnly size="sm" variant="ghost" aria-label="Fechar configuração" onClick={() => setSelectedId(null)}>×</Button></header>
          <Field><Label>Nome do bloco</Label><Input value={selected.data.label} disabled={!canWrite} onChange={(event) => updateSelected({ label: event.target.value })} /></Field>
          <Field><Label>Descrição</Label><Textarea value={selected.data.description} disabled={!canWrite} rows={4} onChange={(event) => updateSelected({ description: event.target.value })} /></Field>
          <NodeConfiguration node={selected} disabled={!canWrite} onChange={(config) => updateSelected({ config })} />
          {canWrite && <Button variant="ghost" className={styles.deleteButton} onClick={removeSelected}>Excluir bloco</Button>}
        </> : <div className={styles.inspectorEmpty}><strong>Configuração do bloco</strong><span>Selecione um bloco no canvas para editar suas propriedades.</span></div>}
      </aside>
    </div>
    <ActionModal open={runModalOpen} onOpenChange={setRunModalOpen} title="Executar automação" confirmLabel="Iniciar execução" errorText="Selecione um contato." onConfirm={startRun}><Field><Label>Contato</Label><SearchSelect label="Contato da execução" searchPlacement="dropdown" placeholder="Buscar contato" options={contacts.filter((contact) => !contact.deletedAt).map((contact) => ({ value: contact.id, label: contact.name, ...(contact.email ? { description: contact.email } : {}) }))} value={runContact} onValueChange={setRunContact} /></Field></ActionModal>
  </div>;
}

function NodeConfiguration({ node, disabled, onChange }: { node: AutomationNode; disabled: boolean; onChange: (config: Record<string, unknown>) => void }) {
  const config = node.data.config;
  if (node.type === "trigger") return <Field><Label>Evento</Label><Select label="Evento que inicia o fluxo" disabled={disabled} value={stringConfig(config.eventType)} options={[{ value: "manual", label: "Execução manual" }, { value: "contact.created", label: "Contato criado" }, { value: "deal.created", label: "Negócio criado" }, { value: "instagram.message_received", label: "Mensagem recebida no Instagram" }, { value: "instagram.comment_created", label: "Comentário no Instagram" }]} onValueChange={(eventType) => onChange({ ...config, eventType })} /></Field>;
  if (node.type === "wait") return <div className={styles.configGrid}><Field><Label>Quantidade</Label><Input type="number" min={0} disabled={disabled} value={numberConfig(config.amount)} onChange={(event) => onChange({ ...config, amount: Number(event.target.value) })} /></Field><Field><Label>Unidade</Label><Select label="Unidade da espera" disabled={disabled} value={stringConfig(config.unit) || "minutes"} options={[{ value: "seconds", label: "Segundos" }, { value: "minutes", label: "Minutos" }, { value: "hours", label: "Horas" }, { value: "days", label: "Dias" }]} onValueChange={(unit) => onChange({ ...config, unit })} /></Field></div>;
  if (node.type === "condition") return <><Field><Label>Campo do contexto</Label><Input disabled={disabled} value={stringConfig(config.field)} placeholder="contact.score" onChange={(event) => onChange({ ...config, field: event.target.value })} /></Field><Field><Label>Operador</Label><Select label="Operador da condição" disabled={disabled} value={stringConfig(config.operator) || "equals"} options={[{ value: "equals", label: "É igual a" }, { value: "not_equals", label: "É diferente de" }, { value: "contains", label: "Contém" }, { value: "greater_than", label: "É maior que" }, { value: "less_than", label: "É menor que" }, { value: "exists", label: "Está preenchido" }]} onValueChange={(operator) => onChange({ ...config, operator })} /></Field>{config.operator !== "exists" && <Field><Label>Valor</Label><Input disabled={disabled} value={stringConfig(config.value)} placeholder="Valor para comparar" onChange={(event) => onChange({ ...config, value: event.target.value })} /></Field>}</>;
  const operation = stringConfig(config.operation);
  return <><Field><Label>Ação no contato</Label><Select label="Ação no contato" disabled={disabled} value={operation} options={[{ value: "contact.add_tag", label: "Adicionar etiqueta" }, { value: "contact.remove_tag", label: "Remover etiqueta" }, { value: "contact.set_status", label: "Alterar situação do lead" }, { value: "contact.add_score", label: "Somar pontuação" }]} onValueChange={(nextOperation) => onChange({ operation: nextOperation, value: nextOperation === "contact.add_score" ? 0 : "" })} /></Field>{operation === "contact.set_status" ? <Field><Label>Nova situação</Label><Select label="Nova situação" disabled={disabled} value={stringConfig(config.value)} options={[{ value: "new", label: "Novo" }, { value: "qualified", label: "Qualificado" }, { value: "nurturing", label: "Em nutrição" }, { value: "customer", label: "Cliente" }, { value: "unqualified", label: "Desqualificado" }]} onValueChange={(value) => onChange({ ...config, value })} /></Field> : <Field><Label>{operation === "contact.add_score" ? "Pontos" : "Etiqueta"}</Label><Input type={operation === "contact.add_score" ? "number" : "text"} disabled={disabled} value={operation === "contact.add_score" ? numberConfig(config.value) : stringConfig(config.value)} onChange={(event) => onChange({ ...config, value: operation === "contact.add_score" ? Number(event.target.value) : event.target.value })} /></Field>}</>;
}

function EdgeLine({ edge, nodes }: { edge: AutomationEdge; nodes: AutomationNode[] }) {
  const source = nodes.find((node) => node.id === edge.source); const target = nodes.find((node) => node.id === edge.target);
  if (!source || !target) return null;
  const x1 = source.position.x + 256; const y1 = source.position.y + 72; const x2 = target.position.x; const y2 = target.position.y + 72;
  const middle = (x1 + x2) / 2;
  return <path d={`M ${x1} ${y1} C ${middle} ${y1}, ${middle} ${y2}, ${x2} ${y2}`} />;
}
function typeLabel(type: AutomationNodeType): string { return ({ trigger: "Gatilho", action: "Ação", condition: "Condição", wait: "Espera" })[type]; }
function runStatusLabel(status: "queued" | "running" | "waiting" | "completed" | "failed" | "cancelled"): string { return ({ queued: "Na fila", running: "Executando", waiting: "Aguardando", completed: "Concluída", failed: "Falhou", cancelled: "Cancelada" })[status]; }
function stringConfig(value: unknown): string { return typeof value === "string" ? value : ""; }
function numberConfig(value: unknown): number { return typeof value === "number" && Number.isFinite(value) ? value : 0; }
