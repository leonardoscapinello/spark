import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useLiveQuery } from "@tanstack/react-db";
import { useNavigate, useParams } from "react-router";
import { automationsControllerPublish } from "@spark/api-client";
import { validateAutomationGraph, type AutomationEdge, type AutomationGraph, type AutomationNode, type AutomationNodeType } from "@spark/core";
import { Badge, Button, Field, Input, Label, PageHeader, Textarea, notify } from "@spark/ui-web";
import { getSession } from "../lib/auth.client";
import { getAutomationVersionsCollection, getAutomationsCollection } from "../lib/automations-collections.client";
import { requireCapability } from "../lib/route-access.client";
import styles from "./automation-builder.module.css";

const NODE_DEFAULTS: Record<AutomationNodeType, { label: string; description: string }> = {
  trigger: { label: "Novo gatilho", description: "Define quando o fluxo começa" },
  action: { label: "Nova ação", description: "Executa uma tarefa" },
  condition: { label: "Nova condição", description: "Divide o caminho por uma regra" },
  wait: { label: "Nova espera", description: "Aguarda um período ou evento" },
};

export async function clientLoader() { await requireCapability("automations:read"); await Promise.all([getAutomationsCollection().preload(), getAutomationVersionsCollection().preload()]); return null; }

export default function AutomationBuilder() {
  const navigate = useNavigate();
  const { automationId } = useParams();
  const session = getSession();
  const collection = getAutomationsCollection();
  const { data: automations } = useLiveQuery({ query: (q) => q.from({ automations: collection }) });
  const automation = automations.find((item) => item.id === automationId) ?? null;
  const [name, setName] = useState("");
  const [graph, setGraph] = useState<AutomationGraph>({ nodes: [], edges: [] });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
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
    if (!exists) setGraph((value) => ({ ...value, edges: [...value.edges, { id: `edge-${crypto.randomUUID()}`, source: connectingFrom, target: targetId }] }));
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

  if (!automation) return <div className={styles.loading}>Carregando automação…</div>;

  return <div className={styles.page}>
    <PageHeader eyebrow="Automações" title={automation.name} description="Arraste os blocos, conecte o caminho e publique quando o fluxo estiver completo." actions={<div className={styles.headerActions}><Button variant="ghost" onClick={() => navigate("/automations")}>Voltar</Button>{canWrite && <Button variant="secondary" loading={saving} onClick={() => void saveDraft()}>Salvar rascunho</Button>}{canPublish && <Button disabled={Boolean(issues.length)} loading={saving} onClick={() => void publish()}>Publicar</Button>}</div>} />
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
  </div>;
}

function NodeConfiguration({ node, disabled, onChange }: { node: AutomationNode; disabled: boolean; onChange: (config: Record<string, unknown>) => void }) {
  const value = typeof node.data.config.value === "string" ? node.data.config.value : "";
  const labels: Record<AutomationNodeType, { field: string; placeholder: string }> = {
    trigger: { field: "Evento", placeholder: "Ex.: Instagram: mensagem recebida" },
    action: { field: "Ação", placeholder: "Ex.: Adicionar tag Qualificado" },
    condition: { field: "Regra", placeholder: "Ex.: Cidade é São Paulo" },
    wait: { field: "Duração", placeholder: "Ex.: 2 horas" },
  };
  return <Field><Label>{labels[node.type].field}</Label><Input value={value} disabled={disabled} placeholder={labels[node.type].placeholder} onChange={(event) => onChange({ ...node.data.config, value: event.target.value })} /></Field>;
}

function EdgeLine({ edge, nodes }: { edge: AutomationEdge; nodes: AutomationNode[] }) {
  const source = nodes.find((node) => node.id === edge.source); const target = nodes.find((node) => node.id === edge.target);
  if (!source || !target) return null;
  const x1 = source.position.x + 256; const y1 = source.position.y + 72; const x2 = target.position.x; const y2 = target.position.y + 72;
  const middle = (x1 + x2) / 2;
  return <path d={`M ${x1} ${y1} C ${middle} ${y1}, ${middle} ${y2}, ${x2} ${y2}`} />;
}
function typeLabel(type: AutomationNodeType): string { return ({ trigger: "Gatilho", action: "Ação", condition: "Condição", wait: "Espera" })[type]; }
