import { createPortal } from "react-dom";
import { useLayoutEffect, useRef, type ComponentPropsWithoutRef, type CSSProperties, type ReactNode, type RefObject } from "react";
import { Avatar } from "../Avatar/Avatar.js";
import { Button, type ButtonProps } from "../Button/Button.js";
import { crmColor } from "../CrmWorkspace/CrmWorkspace.js";
import { Skeleton } from "../Feedback/Feedback.js";
import { Icon } from "../Icon/Icon.js";
import { Surface } from "../Surface/Surface.js";
import { Toolbar } from "../Toolbar/Toolbar.js";
import { ghostTransform, growIn } from "../motion/land.js";
import type { KanbanDragState } from "./useKanbanDrag.js";
import s from "./Kanban.module.css";

/** O quadro: colunas lado a lado, rolagem horizontal, sem vidro dentro. */
export function KanbanBoard({ label, children }: { label: string; children: ReactNode }) {
  return <div className={s.board} role="group" aria-label={label}>{children}</div>;
}

export interface KanbanColumnProps extends Omit<ComponentPropsWithoutRef<"section">, "title" | "children"> {
  columnId: string;
  /** Nome da etapa (texto, ou o botão/campo de renomear). */
  title: ReactNode;
  /** Cor da etapa: só num ponto de 8px, nunca na área. */
  dot?: string | null;
  count: ReactNode;
  /** Soma da coluna, em mono. */
  total?: ReactNode;
  /** Ações do cabeçalho (configurar etapa). */
  actions?: ReactNode;
  /** Destino do arrasto: a coluna realça em --acs. */
  over?: boolean;
  /** «Adicionar negócio», «Mostrar mais». */
  footer?: ReactNode;
  children?: ReactNode;
}

/**
 * Coluna do kanban (origem: Perfil §15): papel cavado (--sf2 + --deb), raio
 * 36, padding 12, 8 entre os cartões. Cabeçalho: ponto da etapa, nome 13/500
 * e contador de 20 em folha com número em mono. Destino do arrasto realça.
 */
export function KanbanColumn({ columnId, title, dot, count, total, actions, over = false, footer, children, className, ...rest }: KanbanColumnProps) {
  return <Surface as="section" elevation="cavada" radius="lg" {...rest} className={[s.column, className].filter(Boolean).join(" ")} data-kcol={columnId} data-over={over || undefined}>
    <header className={s.head}>
      {dot && <span className={s.dot} aria-hidden="true" style={{ "--kanban-dot": dot } as CSSProperties} />}
      <div className={s.title}>{title}</div>
      <span className={s.count}>{count}</span>
      {actions}
    </header>
    {total !== undefined && total !== null && <span className={s.total}>{total}</span>}
    <div className={s.cards}>{children}</div>
    {footer}
  </Surface>;
}

export interface KanbanCardProps extends ComponentPropsWithoutRef<"article"> {
  cardId: string;
  /** Posição na coluna: entrada em cascata, 30 ms por cartão. */
  index?: number;
  /** Recém-criado: sobe como toast. */
  entering?: boolean;
  /** Fora da coluna (na mão, ou a caminho do destino). */
  away?: boolean;
}

/**
 * Cartão do kanban (origem: Perfil §15): folha pousada (--sf + granulação,
 * borda, --sh1), raio 24, padding 14 14 12, 10 entre linhas; no hover ergue
 * 1px com --e2. Entra em cascata; o recém-criado sobe como toast.
 */
export function KanbanCard({ cardId, index = 0, entering = false, away = false, style, children, className, ...rest }: KanbanCardProps) {
  return <Surface as="article" radius="lista" interactive {...rest} className={[s.card, className].filter(Boolean).join(" ")} data-kcard={cardId} data-entering={entering || undefined} hidden={away} style={{ ...style, "--i": Math.min(index, 10) } as CSSProperties}>{children}</Surface>;
}

export interface KanbanCardContentProps {
  /** Etiquetas recolhíveis no topo do cartão. */
  tags?: ReactNode;
  /** Nome do registro (normalmente um link para a página dele). */
  title: ReactNode;
  /** Pessoa · empresa, em tinta 3. */
  subtitle?: ReactNode;
  /** Menu de ações; sem ele, a alça de arrasto. */
  actions?: ReactNode;
  /** Etiquetas (Badge) e situação. */
  chips?: ReactNode;
  /** Valor em mono. */
  value?: ReactNode;
  /** Próximo passo como sinal (Signal), na mesma linha do valor. */
  signal?: ReactNode;
  owner?: { name: string; avatarUrl?: string | null } | null;
  /** Data em mono, à direita do responsável. */
  date?: ReactNode;
}

/** O miolo do cartão — o mesmo no quadro e no fantasma que segue o ponteiro. */
export function KanbanCardContent({ title, subtitle, actions, chips, tags, value, signal, owner, date }: KanbanCardContentProps) {
  const hasChips = Array.isArray(chips) ? chips.length > 0 : Boolean(chips);
  const hasValueLine = (value !== undefined && value !== null) || Boolean(signal);
  return <>
    {tags}
    <div className={s.line1}>
      <div className={s.heading}>
        <span className={s.name}>{title}</span>
        {subtitle && <span className={s.subtitle}>{subtitle}</span>}
      </div>
      {actions ?? <span className={s.grip} aria-hidden="true"><Icon name="grip" /></span>}
    </div>
    {hasChips && <div className={s.chips}>{chips}</div>}
    {hasValueLine && <div className={s.line2}>
      {value !== undefined && value !== null && <span className={s.value}>{value}</span>}
      {signal && <span className={s.signal}>{signal}</span>}
    </div>}
    {(owner || date) && <div className={s.foot}>
      {owner ? <span className={s.owner}><Avatar name={owner.name} src={owner.avatarUrl ?? null} size="small" /><span className={s.ownerName}>{owner.name}</span></span> : <span />}
      {date && <span className={s.date}>{date}</span>}
    </div>}
  </>;
}

/** Uma barrinha por etiqueta; a expansão é compartilhada pelo quadro. */
export function KanbanTags({ tags, expanded, onExpandedChange }: {
  tags: readonly { id: string; name: string; color?: string | null }[];
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
}) {
  if (tags.length === 0) return null;
  return <button
    type="button"
    className={s.tags}
    data-expanded={expanded}
    aria-expanded={expanded}
    aria-label={`${expanded ? "Recolher" : "Expandir"} etiquetas do quadro: ${tags.map(tag => tag.name).join(", ")}`}
    draggable
    onPointerDown={event => event.stopPropagation()}
    onDragStart={event => { event.preventDefault(); event.stopPropagation(); }}
    onClick={event => { event.stopPropagation(); onExpandedChange(!expanded); }}
  >
    {tags.map(tag => <span key={tag.id} className={s.tag} title={tag.name} style={{ backgroundColor: expanded ? undefined : crmColor(tag.color), borderColor: crmColor(tag.color) }}>
      <span className={s.tagName} hidden={!expanded}>{tag.name}</span>
    </span>)}
  </button>;
}

/** O espaço tracejado do destino, com a altura do cartão na mão; nasce da altura zero. */
export function KanbanPlaceholder({ height }: { height: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => { if (ref.current) growIn(ref.current); }, []);
  return <div ref={ref} className={s.placeholder} style={{ height }} aria-hidden="true" />;
}

/** O fantasma na mão: papel segurado (--sf3, --e3), inclinado 1,6° e 3,5% maior. */
export function KanbanGhost({ drag, ghostRef, origin, children }: { drag: KanbanDragState | null; ghostRef: RefObject<HTMLDivElement | null>; origin: { left: number; top: number } | null; children: ReactNode }) {
  if (!drag || !origin || typeof document === "undefined") return null;
  return createPortal(<div ref={ghostRef} className={s.ghost} data-kghost="" data-instant="" aria-hidden="true" style={{ width: drag.width, transform: ghostTransform(origin.left, origin.top) }}>
    <Surface elevation="segurada" radius="lista" className={s.ghostCard ?? ""}>{children}</Surface>
  </div>, document.body);
}

/** «Adicionar negócio»: botão de tinta de 36 na largura da coluna. */
export function KanbanAddButton({ children, ...props }: Omit<ButtonProps, "variant" | "icon" | "size">) {
  return <Button {...props} variant="ghost" size="md" icon={<Icon name="plus" />} className={s.add}>{children}</Button>;
}

/** Quadro carregando: colunas cavadas com o esqueleto dos cartões. */
export function KanbanSkeleton({ label, columns = 3 }: { label: string; columns?: number }) {
  return <div className={s.board} role="status" aria-label={label}>
    {Array.from({ length: columns }, (_, index) => <Surface key={index} elevation="cavada" radius="lg" className={s.column ?? ""}>
      <Skeleton className={s.skeletonTitle} />
      <Skeleton className={s.skeletonCard} />
      <Skeleton className={s.skeletonCard} />
    </Surface>)}
  </div>;
}

/**
 * Barra de ações do arrasto (ganho, perdido, arquivar, mover): folha erguida
 * em pílula que sobe do pé da tela enquanto um cartão está na mão.
 */
export function KanbanDropBar({ label, children }: { label: string; children: ReactNode }) {
  return <Toolbar label={label} className={s.dropBar}>{children}</Toolbar>;
}

/** Zona de soltar da barra: um botão de folha que se ergue quando o cartão passa por cima. */
export function KanbanDropZone({ over = false, ...props }: Omit<ButtonProps, "variant" | "size"> & { over?: boolean }) {
  return <span className={s.zone} data-over={over || undefined}><Button {...props} variant="secondary" size="lg" /></span>;
}
