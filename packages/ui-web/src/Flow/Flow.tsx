import { Button as BaseButton } from "@base-ui/react/button";
import { lightTheme } from "@spark/tokens/native-theme";
import { useLayoutEffect, useRef, useState, type ComponentPropsWithoutRef, type CSSProperties, type ReactNode } from "react";
import { Icon } from "../Icon/Icon.js";
import { landFrom } from "../motion/land.js";
import { Surface } from "../Surface/Surface.js";
import styles from "./Flow.module.css";

/** Ponto no fluxo, em px do palco (sem zoom). */
export interface FlowPoint { x: number; y: number }

/** Tamanho da folha de etapa — o mesmo token que o CSS usa. */
export const FLOW_NODE_SIZE = {
  width: Number.parseFloat(lightTheme["ui-automationNodeWidth"]),
  height: Number.parseFloat(lightTheme["ui-automationNodeHeight"]),
} as const;

// Cada porta tem a altura de um alvo de toque (44) e 4 de intervalo: com duas
// saídas, os centros ficam a ±24 do meio da folha.
const PORT_STEP = Number.parseFloat(lightTheme["h-lg"]) + Number.parseFloat(lightTheme["space-1"]);

/** De onde sai a ligação da saída `index` (de `count`, a primeira em cima). */
export function flowOutputAnchor(position: FlowPoint, index = 0, count = 1): FlowPoint {
  return { x: position.x + FLOW_NODE_SIZE.width, y: position.y + FLOW_NODE_SIZE.height / 2 + (index - (count - 1) / 2) * PORT_STEP };
}

/** Onde a ligação chega: meio da borda esquerda. */
export function flowInputAnchor(position: FlowPoint): FlowPoint {
  return { x: position.x, y: position.y + FLOW_NODE_SIZE.height / 2 };
}

export interface FlowCanvasProps extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  /** Nome da área para leitor de tela. */
  label: string;
  /** Escala do palco (1 = 100%). A grade de pontos acompanha no mesmo tempo. */
  zoom?: number;
  /** Área ocupada pelas etapas, em px do fluxo, para a rolagem alcançar todas. */
  contentSize?: { width: number; height: number } | undefined;
  /** Camada fixa sobre a mesa (barras, painel, estado vazio): não rola nem escala. */
  overlay?: ReactNode;
  children?: ReactNode;
}

/**
 * Mesa do fluxo (ADR-0044): o fundo da página — papel com granulação e grade
 * de pontos — afundado na folha que o contém. `className` vai para a moldura;
 * eventos de ponteiro e `style` vão para a área que rola.
 */
export function FlowCanvas({ label, zoom = 1, contentSize, overlay, children, className, style, ...viewport }: FlowCanvasProps) {
  const stage: CSSProperties = { transform: `scale(${zoom})` };
  if (contentSize) {
    stage.minWidth = `max(100%, ${contentSize.width}px)`;
    stage.minHeight = `max(100%, ${contentSize.height}px)`;
  }
  return <section aria-label={label} className={[styles.canvas, className].filter(Boolean).join(" ")}>
    <div {...viewport} className={styles.viewport} style={{ ...style, "--flow-zoom": zoom } as CSSProperties}>
      <div className={styles.stage} style={stage}>{children}</div>
    </div>
    {overlay}
  </section>;
}

/** Camada das ligações: fica sob as etapas e não recebe clique. */
export function FlowEdges({ children }: { children?: ReactNode }) {
  return <svg className={styles.edges} aria-hidden="true">{children}</svg>;
}

export interface FlowEdgeProps {
  from: FlowPoint;
  to: FlowPoint;
  /** solid: ligação feita · conditional: ramo de uma condição · pending: ligação em andamento. Os dois últimos são tracejados. */
  kind?: "solid" | "conditional" | "pending";
}

/** Ligação entre etapas: curva que sai e chega na horizontal. */
export function FlowEdge({ from, to, kind = "solid" }: FlowEdgeProps) {
  const middle = (from.x + to.x) / 2;
  return <path className={styles.edge} data-kind={kind} d={`M ${from.x} ${from.y} C ${middle} ${from.y}, ${middle} ${to.y}, ${to.x} ${to.y}`} />;
}

export interface FlowNodeProps extends Omit<ComponentPropsWithoutRef<"article">, "title" | "children"> {
  /** Canto superior esquerdo, em px do fluxo. */
  position: FlowPoint;
  /** Tipo da etapa ("Gatilho"), escrito ao lado do ponto do tipo. */
  kind: string;
  /** Cor do ponto do tipo: um pigmento da identidade, var(--v1)…var(--v4). */
  dot?: string | undefined;
  title: string;
  description?: string | undefined;
  selected?: boolean | undefined;
  /** Sendo arrastada: ergue como o fantasma do kanban e segue o ponteiro sem física. */
  dragging?: boolean | undefined;
  /** Pode ser arrastada: mostra a pega e o cursor de mão. */
  movable?: boolean | undefined;
  /** Há rótulo nas saídas (Sim/Não): o texto abre espaço à direita. */
  branched?: boolean | undefined;
  /** Porta de entrada, no meio da borda esquerda. */
  input?: ReactNode;
  /** Portas de saída, empilhadas no meio da borda direita. */
  outputs?: ReactNode;
}

/**
 * Etapa do fluxo (origem: Mais, "Kanban", cartão): folha pousada de raio 24.
 * O tipo é um ponto de pigmento, nunca a folha pintada. Selecionada, ganha o
 * halo de foco; no hover ergue 1px com --e2; arrastada, inclina 1,6°, cresce
 * 1,035 e sobe para --e3 — e ao soltar pousa em três tempos (landFrom).
 */
export function FlowNode({ position, kind, dot, title, description, selected = false, dragging = false, movable = false, branched = false, input, outputs, className, style, ...rest }: FlowNodeProps) {
  const head = useRef<HTMLElement>(null);
  // Ao soltar, a folha pousa como o cartão do kanban (landFrom): sem física
  // global no caminho, senão a transição de 550 ms passaria por cima do pouso.
  const [landing, setLanding] = useState(false);
  const [wasDragging, setWasDragging] = useState(dragging);
  if (wasDragging !== dragging) {
    setWasDragging(dragging);
    if (!dragging) setLanding(true);
  }
  useLayoutEffect(() => {
    if (!landing) return;
    const element = head.current?.parentElement;
    const rect = element?.getBoundingClientRect();
    const animation = element && rect ? landFrom(element, { left: rect.left, top: rect.top }) : null;
    if (!animation) { setLanding(false); return; }
    const done = () => setLanding(false);
    animation.addEventListener("finish", done, { once: true });
    animation.addEventListener("cancel", done, { once: true });
    return () => animation.cancel();
  }, [landing]);
  const placement = { ...style, translate: `${position.x}px ${position.y}px`, ...(dot ? { "--flow-dot": dot } : {}) } as CSSProperties;
  return <Surface
    as="article"
    {...rest}
    elevation={dragging ? "segurada" : "pousada"}
    radius="lista"
    interactive={!dragging}
    className={[styles.node, className].filter(Boolean).join(" ")}
    data-selected={selected || undefined}
    data-dragging={dragging || undefined}
    data-movable={movable || undefined}
    data-branched={branched || undefined}
    // Arrastando, a folha acompanha o ponteiro na hora; pousando, o pouso manda.
    data-instant={dragging || landing ? "" : undefined}
    style={placement}
  >
    <header ref={head} className={styles.head}>
      <span className={styles.kind}><span className={styles.dot} aria-hidden="true" />{kind}</span>
      {movable && <span className={styles.grip} aria-hidden="true"><Icon name="grip" /></span>}
    </header>
    <strong className={styles.title}>{title}</strong>
    {description && <p className={styles.description}>{description}</p>}
    {input && <div className={styles.input}>{input}</div>}
    {outputs && <div className={styles.outputs}>{outputs}</div>}
  </Surface>;
}

export interface FlowPortProps extends Omit<ComponentPropsWithoutRef<typeof BaseButton>, "children" | "className" | "aria-label"> {
  /** Entrada (borda esquerda) ou saída (borda direita). */
  side: "in" | "out";
  /** Rótulo fixo dentro da folha, ao lado da porta ("Sim", "Não"). */
  label?: string | undefined;
  /** Dica que aparece no hover e no foco ("Próximo passo"). */
  hint?: string | undefined;
  /** Esta porta segura uma ligação em andamento. */
  active?: boolean | undefined;
  "aria-label": string;
}

/** Porta de ligação: alvo de 44 com um ponto de 14 na borda da folha. */
export function FlowPort({ side, label, hint, active = false, ...rest }: FlowPortProps) {
  return <BaseButton type="button" {...rest} className={styles.port} data-side={side} data-active={active || undefined}>
    <span className={styles.portDot} aria-hidden="true" />
    {label && <span className={styles.portLabel} aria-hidden="true">{label}</span>}
    {hint && <span className={styles.portHint} aria-hidden="true">{hint}</span>}
  </BaseButton>;
}
