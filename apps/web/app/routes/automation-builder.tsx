import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { Link, useNavigate, useParams } from "react-router";
import { lightTheme } from "@spark/tokens/native-theme";
import { automationsControllerPublish, automationsControllerRun } from "@spark/api-client";
import { validateAutomationGraph, type AutomationEdge, type AutomationGraph, type AutomationNode, type AutomationNodeType } from "@spark/core";
import {
  ActionModal,
  Alert,
  BackLink,
  Button,
  Chip,
  EmptyState,
  FLOW_NODE_SIZE,
  Field,
  FlowCanvas,
  FlowEdge,
  FlowEdges,
  FlowNode,
  FlowPort,
  Icon,
  IconTile,
  Input,
  Label,
  ListRow,
  ListRowButton,
  MenuButton,
  MenuItem,
  PageHeader,
  PageState,
  RowList,
  SearchSelect,
  SectionTitle,
  Select,
  SidePanel,
  Signal,
  Skeleton,
  Textarea,
  Toolbar,
  ToolbarSeparator,
  ToolbarText,
  flowInputAnchor,
  flowOutputAnchor,
  notify,
  type FlowPoint,
  type IconName,
  type SelectOption,
} from "@spark/ui-web";
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
const NODE_ICONS: Record<AutomationNodeType, IconName> = { trigger: "bolt", action: "play", condition: "funnel", wait: "clock" };
// O tipo da etapa vive num ponto de pigmento, na ordem fixa da identidade.
const NODE_DOT: Record<AutomationNodeType, string> = { trigger: "var(--v1)", action: "var(--v2)", condition: "var(--v3)", wait: "var(--v4)" };
const space = (token: "space-1" | "space-2" | "space-8" | "space-10" | "space-16") => Number.parseFloat(lightTheme[token]);
const NODE_ORIGIN = { x: space("space-16") - space("space-2"), y: space("space-16") };
const NODE_STEP = { x: FLOW_NODE_SIZE.width + space("space-8") + space("space-1"), y: FLOW_NODE_SIZE.height + space("space-10") };
const CANVAS_MARGIN = space("space-16");
// Como no kanban: até 4px de deslocamento é clique, não arrasto.
const DRAG_THRESHOLD = space("space-1");
const ZOOM = { min: 0.5, max: 1.5, step: 0.25 };
const BRANCHES = ["sim", "não"] as const;
type Branch = (typeof BRANCHES)[number];
type PanelMode = "closed" | "palette" | "inspector" | "runs";
type RunStatus = "queued" | "running" | "waiting" | "completed" | "failed" | "cancelled";
const AUTOMATION_STATUS = {
  draft: { label: "Rascunho", dot: "var(--tx3)" },
  active: { label: "Ativa", dot: "var(--ok)" },
  paused: { label: "Pausada", dot: "var(--wa)" },
} as const;
const RUN_STATUS: Record<RunStatus, { label: string; icon: IconName; tone: "muted" | "info" | "warning" | "success" | "danger" }> = {
  queued: { label: "Na fila", icon: "clock", tone: "muted" },
  running: { label: "Executando", icon: "play", tone: "info" },
  waiting: { label: "Aguardando", icon: "clock", tone: "warning" },
  completed: { label: "Concluída", icon: "check", tone: "success" },
  failed: { label: "Falhou", icon: "alert", tone: "danger" },
  cancelled: { label: "Cancelada", icon: "x", tone: "muted" },
};
const RUN_DATE = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

export async function clientLoader() { const session = await requireCapability("automations:read"); void Promise.allSettled([getAutomationsCollection().preload(), getAutomationVersionsCollection().preload(), getAutomationRunsCollection().preload(), getAutomationRunStepsCollection().preload(), ...(session.capabilities.includes("contacts:read") ? [getContactsCollection().preload()] : [])]); return null; }

export default function AutomationBuilder() {
  const navigate = useNavigate();
  const { automationId } = useParams();
  const session = getSession();
  const collection = getAutomationsCollection();
  const { data: automations, isLoading } = useLiveQuery({ query: (q) => q.from({ automations: collection }) });
  const { data: runs = [] } = useLiveQuery({ query: (q) => automationId ? q.from({ runs: getAutomationRunsCollection() }).where(({ runs: run }) => eq(run.automationId, automationId)).orderBy(({ runs: run }) => run.startedAt, "desc") : undefined });
  const canReadContacts = session?.capabilities.includes("contacts:read") ?? false;
  const { data: contacts = [] } = useLiveQuery({ query: (q) => canReadContacts ? q.from({ contacts: getContactsCollection() }).orderBy(({ contacts: contact }) => contact.name, "asc") : undefined });
  const automation = automations.find((item) => item.id === automationId) ?? null;
  const [name, setName] = useState("");
  const [graph, setGraph] = useState<AutomationGraph>({ nodes: [], edges: [] });
  const [zoom, setZoom] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>("closed");
  const [connectingFrom, setConnectingFrom] = useState<{ nodeId: string; label?: Branch } | null>(null);
  const [pointer, setPointer] = useState<FlowPoint | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [runModalOpen, setRunModalOpen] = useState(false);
  const [runContact, setRunContact] = useState<SelectOption | null>(null);
  const hydratedId = useRef<string | null>(null);
  const drag = useRef<{ id: string; startX: number; startY: number; originX: number; originY: number; moved: boolean } | null>(null);
  const pointerFrame = useRef(0);
  const canWrite = session?.capabilities.includes("automations:write") ?? false;
  const canPublish = session?.capabilities.includes("automations:publish") ?? false;

  useEffect(() => {
    if (automation && hydratedId.current !== automation.id) {
      hydratedId.current = automation.id;
      setName(automation.name);
      setGraph(automation.draftGraph);
    }
  }, [automation]);

  // Arrasto: depois de 4px a etapa vira fantasma (FlowNode `dragging`) e segue
  // o ponteiro um quadro por vez; ao soltar, pousa pela física global.
  useEffect(() => {
    let frame = 0;
    let next: { id: string; x: number; y: number } | null = null;
    function move(event: PointerEvent) {
      const current = drag.current;
      if (!current) return;
      const dx = event.clientX - current.startX;
      const dy = event.clientY - current.startY;
      if (!current.moved) {
        if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
        current.moved = true;
        setDraggingId(current.id);
      }
      next = { id: current.id, x: Math.max(0, current.originX + dx / zoom), y: Math.max(0, current.originY + dy / zoom) };
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const target = next;
        if (!target) return;
        setGraph((value) => ({ ...value, nodes: value.nodes.map((node) => node.id === target.id ? { ...node, position: { x: target.x, y: target.y } } : node) }));
      });
    }
    function end() { drag.current = null; setDraggingId(null); }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", end); window.removeEventListener("pointercancel", end); };
  }, [zoom]);

  // Esc desiste da ligação em andamento.
  useEffect(() => {
    if (!connectingFrom) return;
    function cancel(event: KeyboardEvent) { if (event.key === "Escape") { setConnectingFrom(null); setPointer(null); } }
    window.addEventListener("keydown", cancel);
    return () => window.removeEventListener("keydown", cancel);
  }, [connectingFrom]);

  useEffect(() => () => cancelAnimationFrame(pointerFrame.current), []);

  const selected = graph.nodes.find((node) => node.id === selectedId) ?? null;
  const issues = useMemo(() => validateAutomationGraph(graph), [graph]);
  const canvasBounds = useMemo(() => graph.nodes.reduce((bounds, node) => ({
    width: Math.max(bounds.width, node.position.x + FLOW_NODE_SIZE.width + CANVAS_MARGIN),
    height: Math.max(bounds.height, node.position.y + FLOW_NODE_SIZE.height + CANVAS_MARGIN),
  }), { width: 0, height: 0 }), [graph.nodes]);
  const contactNames = useMemo(() => new Map<string, string>(contacts.map((contact) => [contact.id, contact.name] as const)), [contacts]);

  function openNode(id: string) {
    setSelectedId(id);
    setPanelMode("inspector");
  }

  function closePanel() {
    setPanelMode("closed");
    setSelectedId(null);
  }

  function addNode(type: AutomationNodeType) {
    const id = `${type}-${crypto.randomUUID()}`;
    const count = graph.nodes.length;
    const node: AutomationNode = { id, type, position: { x: NODE_ORIGIN.x + (count % 3) * NODE_STEP.x, y: NODE_ORIGIN.y + Math.floor(count / 3) * NODE_STEP.y }, data: { ...NODE_DEFAULTS[type], config: {} } };
    setGraph((value) => ({ ...value, nodes: [...value.nodes, node] }));
    openNode(id);
  }

  function pressNode(event: ReactPointerEvent<HTMLElement>, node: AutomationNode) {
    event.stopPropagation();
    if (event.button !== 0) return;
    // Ligando: tocar a folha de destino conclui a ligação (alvo maior que a porta).
    if (connectingFrom && connectingFrom.nodeId !== node.id) { finishConnection(node.id); return; }
    openNode(node.id);
    if (!canWrite) return;
    event.preventDefault();
    drag.current = { id: node.id, startX: event.clientX, startY: event.clientY, originX: node.position.x, originY: node.position.y, moved: false };
  }

  function startConnection(nodeId: string, label?: Branch) {
    setPointer(null);
    setConnectingFrom((current) => current?.nodeId === nodeId && current.label === label ? null : { nodeId, ...(label ? { label } : {}) });
  }

  function finishConnection(targetId: string) {
    if (!connectingFrom || connectingFrom.nodeId === targetId) return;
    const source = connectingFrom;
    setGraph((value) => {
      const exists = value.edges.some((edge) => edge.source === source.nodeId && edge.target === targetId && edge.label === source.label);
      if (exists) return value;
      return { ...value, edges: [...value.edges, { id: `edge-${crypto.randomUUID()}`, source: source.nodeId, target: targetId, ...(source.label ? { label: source.label } : {}) }] };
    });
    setConnectingFrom(null);
    setPointer(null);
  }

  // A linha tracejada da ligação em andamento segue o ponteiro, em px do fluxo.
  function trackPointer(event: ReactPointerEvent<HTMLDivElement>) {
    if (!connectingFrom) return;
    const viewport = event.currentTarget;
    const rect = viewport.getBoundingClientRect();
    const next = { x: (event.clientX - rect.left + viewport.scrollLeft) / zoom, y: (event.clientY - rect.top + viewport.scrollTop) / zoom };
    cancelAnimationFrame(pointerFrame.current);
    pointerFrame.current = requestAnimationFrame(() => setPointer(next));
  }

  function updateSelected(data: Partial<AutomationNode["data"]>) {
    if (!selectedId) return;
    setGraph((value) => ({ ...value, nodes: value.nodes.map((node) => node.id === selectedId ? { ...node, data: { ...node.data, ...data } } : node) }));
  }

  function removeSelected() {
    if (!selectedId) return;
    setGraph((value) => ({ nodes: value.nodes.filter((node) => node.id !== selectedId), edges: value.edges.filter((edge) => edge.source !== selectedId && edge.target !== selectedId) }));
    closePanel();
    setConnectingFrom(null);
  }

  async function saveDraft() {
    if (!automation || !canWrite || saving) return;
    setSaving(true);
    try {
      await collection.update(automation.id, (draft) => { draft.name = name.trim() || automation.name; draft.draftGraph = graph; }).isPersisted.promise;
      const count = graph.nodes.length;
      notify({ title: "Rascunho salvo", description: `${count} ${count === 1 ? "etapa sincronizada" : "etapas sincronizadas"}.`, tone: "success" });
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
      notify({ title: `Versão ${result.version.version} publicada`, description: "Novas entradas seguirão esta versão do fluxo.", tone: "success" });
    } catch { notify({ title: "Não foi possível publicar", description: "Atualize o rascunho e tente novamente.", tone: "error" }); }
    finally { setSaving(false); }
  }

  async function startRun() {
    if (!automation || !runContact) throw new Error("MISSING_CONTACT");
    await automationsControllerRun(automation.id, { contactId: runContact.value, context: { source: "manual" } });
    notify({ title: "Execução iniciada", description: "A pessoa entrou no fluxo.", tone: "success" });
    setRunContact(null);
  }

  const back = <BackLink render={<Link to="/automations" />}>Automações</BackLink>;
  if (!automation) return <div className={styles.fallback}>
    <PageHeader back={back} title="Editor de automação" />
    {isLoading
      ? <div className={styles.loading} role="status" aria-label="Carregando automação"><Skeleton /><Skeleton /><Skeleton /></div>
      : <PageState kind="not-found" title="Automação não encontrada" description="Este fluxo não está mais disponível ou você não tem acesso a ele." action={<Button variant="secondary" onClick={() => navigate("/automations")}>Ver automações</Button>} />}
  </div>;

  const status = AUTOMATION_STATUS[automation.status];
  const pendingSource = connectingFrom ? graph.nodes.find((node) => node.id === connectingFrom.nodeId) : undefined;
  const panel = panelContent();

  function panelContent(): { eyebrow: string; title: string; description?: string; footer?: ReactNode; body: ReactNode } {
    if (panelMode === "inspector" && selected) return {
      eyebrow: `Etapa · ${typeLabel(selected.type)}`,
      title: selected.data.label || "Etapa sem nome",
      ...(canWrite ? { footer: <Button variant="secondary" tone="danger" icon={<Icon name="trash" />} onClick={removeSelected}>Excluir etapa</Button> } : {}),
      body: <>
        <Field><Label>Nome da etapa</Label><Input value={selected.data.label} disabled={!canWrite} onChange={(event) => updateSelected({ label: event.target.value })} /></Field>
        <Field><Label>Descrição</Label><Textarea value={selected.data.description} disabled={!canWrite} rows={3} onChange={(event) => updateSelected({ description: event.target.value })} /></Field>
        <NodeConfiguration node={selected} disabled={!canWrite} onChange={(config) => updateSelected({ config })} />
      </>,
    };
    if (panelMode === "runs") return {
      eyebrow: "Histórico",
      title: "Execuções",
      ...(runs.length ? { description: `${runs.length} ${runs.length === 1 ? "registrada" : "registradas"} nesta automação.` } : {}),
      body: runs.length
        ? <RowList label="Execuções recentes">{runs.slice(0, 20).map((run, index) => <ListRow
          key={run.id}
          index={index}
          leading={<IconTile icon={RUN_STATUS[run.status].icon} size="sm" tone={RUN_STATUS[run.status].tone} />}
          title={RUN_STATUS[run.status].label}
          description={contactNames.get(run.contactId) ?? "Pessoa do fluxo"}
          meta={RUN_DATE.format(new Date(run.startedAt))}
        />)}</RowList>
        : <EmptyState icon="play" title="Nenhuma execução ainda" description="Quando alguém entrar no fluxo, a execução aparece aqui." />,
    };
    return {
      eyebrow: "Fluxo",
      title: "Adicionar etapa",
      description: "Escolha o que acontece neste ponto do fluxo.",
      body: <>
        <div className={styles.paletteGroup}>
          <SectionTitle level="block" as="h3">Passo inicial</SectionTitle>
          <RowList><ListRowButton index={0} icon={NODE_ICONS.trigger} dot={NODE_DOT.trigger} title="Gatilho" description={NODE_DEFAULTS.trigger.description} disabled={!canWrite} onClick={() => addNode("trigger")} /></RowList>
        </div>
        <div className={styles.paletteGroup}>
          <SectionTitle level="block" as="h3">Lógica e execução</SectionTitle>
          <RowList>{(["action", "condition", "wait"] as const).map((type, index) => <ListRowButton key={type} index={index + 1} icon={NODE_ICONS[type]} dot={NODE_DOT[type]} title={typeLabel(type)} description={NODE_DEFAULTS[type].description} disabled={!canWrite} onClick={() => addNode(type)} />)}</RowList>
        </div>
        <div className={styles.validation}>
          <Alert tone={issues.length ? "warning" : "success"} title={issues.length ? "Antes de publicar" : "Pronto para publicar"}>
            {issues.length ? issues.map((issue) => issue.message).join(" ") : "Fluxo válido e conectado."}
          </Alert>
        </div>
      </>,
    };
  }

  return <div className={styles.page}>
    <div className={styles.header}>
      <PageHeader back={back} title={automation.name} actions={<>
        <Chip dot={status.dot}>{status.label}</Chip>
        <MenuButton size="sm" variant="ghost" iconOnly indicator={false} icon={<Icon name="more" />} aria-label="Mais ações do fluxo" menu={<>
          <MenuItem onClick={() => panelMode === "runs" ? closePanel() : setPanelMode("runs")}>{panelMode === "runs" ? "Ocultar execuções" : `Ver execuções (${runs.length})`}</MenuItem>
          {selected && panelMode !== "inspector" && <MenuItem onClick={() => setPanelMode("inspector")}>Configurar etapa</MenuItem>}
          {canWrite && automation.status === "active" && canReadContacts && <MenuItem onClick={() => setRunModalOpen(true)}>Executar agora</MenuItem>}
        </>} />
        {canWrite && <Button variant="secondary" loading={saving} onClick={() => void saveDraft()}>Salvar rascunho</Button>}
        {canPublish && <Button disabled={Boolean(issues.length)} loading={saving} onClick={() => void publish()}>Publicar</Button>}
      </>} />
    </div>
    <FlowCanvas
      className={styles.canvas}
      label="Fluxo da automação"
      zoom={zoom}
      contentSize={canvasBounds}
      onPointerDown={() => { closePanel(); setConnectingFrom(null); setPointer(null); }}
      onPointerMove={trackPointer}
      overlay={<>
        <Toolbar label="Etapas do fluxo" className={styles.toolbarStart}>
          {canWrite && <><Button size="sm" variant="ghost" icon={<Icon name="plus" />} onClick={() => setPanelMode("palette")}>Adicionar etapa</Button><ToolbarSeparator /></>}
          <ToolbarText><Signal tone={issues.length ? "warning" : "success"}>{issues.length ? `${issues.length} ${issues.length === 1 ? "pendência" : "pendências"}` : "Pronto para publicar"}</Signal></ToolbarText>
        </Toolbar>
        <Toolbar label="Zoom do fluxo" className={styles.toolbarZoom}>
          <Button iconOnly size="sm" variant="ghost" icon={<Icon name="minus" />} aria-label="Reduzir zoom" disabled={zoom <= ZOOM.min} onClick={() => setZoom((value) => Math.max(ZOOM.min, value - ZOOM.step))} />
          <Button size="sm" variant="ghost" aria-label="Voltar ao zoom de 100%" onClick={() => setZoom(1)}>{`${Math.round(zoom * 100)}%`}</Button>
          <Button iconOnly size="sm" variant="ghost" icon={<Icon name="plus" />} aria-label="Ampliar zoom" disabled={zoom >= ZOOM.max} onClick={() => setZoom((value) => Math.min(ZOOM.max, value + ZOOM.step))} />
        </Toolbar>
        {graph.nodes.length === 0 && <div className={styles.empty}>
          <EmptyState icon="bolt" title="O fluxo começa com um gatilho" description="Adicione o primeiro passo para definir quando a automação começa." action={canWrite ? <Button icon={<Icon name="plus" />} onClick={() => addNode("trigger")}>Adicionar gatilho</Button> : undefined} />
        </div>}
        <SidePanel open={panelMode !== "closed"} onClose={closePanel} eyebrow={panel.eyebrow} title={panel.title} description={panel.description} footer={panel.footer}>{panel.body}</SidePanel>
      </>}
    >
      <FlowEdges>
        {graph.edges.map((edge) => <EdgeLine key={edge.id} edge={edge} nodes={graph.nodes} />)}
        {pendingSource && pointer && <FlowEdge kind="pending" from={outputAnchor(pendingSource, connectingFrom?.label)} to={pointer} />}
      </FlowEdges>
      {graph.nodes.map((node) => {
        const outputs: readonly (Branch | undefined)[] = node.type === "condition" ? BRANCHES : [undefined];
        return <FlowNode
          key={node.id}
          position={node.position}
          kind={typeLabel(node.type)}
          dot={NODE_DOT[node.type]}
          title={node.data.label}
          description={node.data.description || undefined}
          selected={selectedId === node.id}
          dragging={draggingId === node.id}
          movable={canWrite}
          branched={canWrite && node.type === "condition"}
          tabIndex={0}
          aria-label={`${typeLabel(node.type)}: ${node.data.label}`}
          onPointerDown={(event) => pressNode(event, node)}
          onKeyDown={(event) => { if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); if (connectingFrom && connectingFrom.nodeId !== node.id) finishConnection(node.id); else openNode(node.id); } }}
          input={canWrite && connectingFrom && connectingFrom.nodeId !== node.id
            ? <FlowPort side="in" aria-label={`Conectar a ${node.data.label}`} onPointerDown={(event) => event.stopPropagation()} onClick={() => finishConnection(node.id)} />
            : undefined}
          outputs={canWrite ? outputs.map((label) => {
            const active = connectingFrom?.nodeId === node.id && connectingFrom.label === label;
            return <FlowPort
              key={label ?? "next"}
              side="out"
              label={label === "sim" ? "Sim" : label === "não" ? "Não" : undefined}
              hint={label ? undefined : "Próximo passo"}
              active={active}
              aria-label={active ? "Cancelar ligação" : `Conectar ${label ? `saída ${label}` : "próxima etapa"} de ${node.data.label}`}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => startConnection(node.id, label)}
            />;
          }) : undefined}
        />;
      })}
    </FlowCanvas>
    <ActionModal open={runModalOpen} onOpenChange={setRunModalOpen} title="Executar automação" confirmLabel="Iniciar execução" errorText="Selecione uma pessoa." onConfirm={startRun}><Field><Label>Pessoa</Label><SearchSelect label="Pessoa da execução" searchPlacement="dropdown" placeholder="Buscar pessoa" options={contacts.filter((contact) => !contact.deletedAt).map((contact) => ({ value: contact.id, label: contact.name, ...(contact.email ? { description: contact.email } : {}) }))} value={runContact} onValueChange={setRunContact} /></Field></ActionModal>
  </div>;
}

function NodeConfiguration({ node, disabled, onChange }: { node: AutomationNode; disabled: boolean; onChange: (config: Record<string, unknown>) => void }) {
  const config = node.data.config;
  if (node.type === "trigger") return <Field><Label>Evento</Label><Select label="Evento que inicia o fluxo" disabled={disabled} value={stringConfig(config.eventType)} options={[{ value: "manual", label: "Execução manual" }, { value: "contact.created", label: "Pessoa cadastrada" }, { value: "deal.created", label: "Negócio criado" }, { value: "instagram.message_received", label: "Mensagem recebida no Instagram" }, { value: "instagram.comment_created", label: "Comentário no Instagram" }]} onValueChange={(eventType) => onChange({ ...config, eventType })} /></Field>;
  if (node.type === "wait") return <div className={styles.configGrid}><Field><Label>Quantidade</Label><Input type="number" min={0} disabled={disabled} value={numberConfig(config.amount)} onChange={(event) => onChange({ ...config, amount: Number(event.target.value) })} /></Field><Field><Label>Unidade</Label><Select label="Unidade da espera" disabled={disabled} value={stringConfig(config.unit) || "minutes"} options={[{ value: "seconds", label: "Segundos" }, { value: "minutes", label: "Minutos" }, { value: "hours", label: "Horas" }, { value: "days", label: "Dias" }]} onValueChange={(unit) => onChange({ ...config, unit })} /></Field></div>;
  if (node.type === "condition") return <><Field><Label>Campo do contexto</Label><Input disabled={disabled} value={stringConfig(config.field)} placeholder="contact.score" onChange={(event) => onChange({ ...config, field: event.target.value })} /></Field><Field><Label>Operador</Label><Select label="Operador da condição" disabled={disabled} value={stringConfig(config.operator) || "equals"} options={[{ value: "equals", label: "É igual a" }, { value: "not_equals", label: "É diferente de" }, { value: "contains", label: "Contém" }, { value: "greater_than", label: "É maior que" }, { value: "less_than", label: "É menor que" }, { value: "exists", label: "Está preenchido" }]} onValueChange={(operator) => onChange({ ...config, operator })} /></Field>{config.operator !== "exists" && <Field><Label>Valor</Label><Input disabled={disabled} value={stringConfig(config.value)} placeholder="Valor para comparar" onChange={(event) => onChange({ ...config, value: event.target.value })} /></Field>}</>;
  const operation = stringConfig(config.operation);
  return <><Field><Label>Ação na pessoa</Label><Select label="Ação na pessoa" disabled={disabled} value={operation} options={[{ value: "contact.add_tag", label: "Adicionar etiqueta" }, { value: "contact.remove_tag", label: "Remover etiqueta" }, { value: "contact.set_status", label: "Alterar situação do lead" }, { value: "contact.add_score", label: "Somar pontuação" }]} onValueChange={(nextOperation) => onChange({ operation: nextOperation, value: nextOperation === "contact.add_score" ? 0 : "" })} /></Field>{operation === "contact.set_status" ? <Field><Label>Nova situação</Label><Select label="Nova situação" disabled={disabled} value={stringConfig(config.value)} options={[{ value: "new", label: "Novo" }, { value: "qualified", label: "Qualificado" }, { value: "nurturing", label: "Em nutrição" }, { value: "customer", label: "Cliente" }, { value: "unqualified", label: "Desqualificado" }]} onValueChange={(value) => onChange({ ...config, value })} /></Field> : <Field><Label>{operation === "contact.add_score" ? "Pontos" : "Etiqueta"}</Label><Input type={operation === "contact.add_score" ? "number" : "text"} disabled={disabled} value={operation === "contact.add_score" ? numberConfig(config.value) : stringConfig(config.value)} onChange={(event) => onChange({ ...config, value: operation === "contact.add_score" ? Number(event.target.value) : event.target.value })} /></Field>}</>;
}

function EdgeLine({ edge, nodes }: { edge: AutomationEdge; nodes: AutomationNode[] }) {
  const source = nodes.find((node) => node.id === edge.source);
  const target = nodes.find((node) => node.id === edge.target);
  if (!source || !target) return null;
  // Ramo de condição é tracejado; a ligação direta é contínua.
  return <FlowEdge kind={edge.label ? "conditional" : "solid"} from={outputAnchor(source, edge.label)} to={flowInputAnchor(target.position)} />;
}

function outputAnchor(node: AutomationNode, label: string | undefined): FlowPoint {
  return node.type === "condition" ? flowOutputAnchor(node.position, label === "não" ? 1 : 0, BRANCHES.length) : flowOutputAnchor(node.position);
}
function typeLabel(type: AutomationNodeType): string { return ({ trigger: "Gatilho", action: "Ação", condition: "Condição", wait: "Espera" })[type]; }
function stringConfig(value: unknown): string { return typeof value === "string" ? value : ""; }
function numberConfig(value: unknown): number { return typeof value === "number" && Number.isFinite(value) ? value : 0; }
