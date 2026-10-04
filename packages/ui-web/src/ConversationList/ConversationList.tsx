import { SlaProgress } from "../SlaProgress/SlaProgress.js";
import { Children, createContext, isValidElement, useContext, useEffect, useRef, type CSSProperties, type KeyboardEvent, type ReactElement, type ReactNode } from "react";
import { Avatar } from "../Avatar/Avatar.js";
import { Icon, type IconName } from "../Icon/Icon.js";
import { Signal, type SignalTone } from "../Signal/Signal.js";
import { useSlidingIndicator } from "../motion/useSlidingIndicator.js";
import s from "./ConversationList.module.css";

export type ConversationListLayout = "compact" | "wide";

const LayoutContext = createContext<ConversationListLayout>("compact");
const count = new Intl.NumberFormat("pt-BR");

export interface ConversationListProps {
  /** Nome acessível da lista («Conversas abertas»). */
  label: string;
  /** compact: coluna ao lado da conversa (três linhas). wide: caixa larga, uma linha por conversa, como um cliente de e-mail. */
  layout?: ConversationListLayout;
  /** Sem linhas: frase curta no lugar da lista (carregando, caixa vazia, busca sem resultado). */
  empty?: ReactNode;
  children?: ReactNode;
}

/**
 * Lista densa de conversas (atendimento; serve a qualquer lista que chega a
 * mil itens). Linhas retas, sem espaço entre elas, separadas por um fio de
 * 1px que começa na coluna do texto, como num cliente de e-mail. Só a linha
 * realçada ganha raio: --acs no hover, e a folha pousada da seleção desliza
 * até a conversa aberta pela física global. Nunca pílula em linha de várias
 * linhas. As linhas entram em cascata de 30 ms; ↑ e ↓ andam entre elas.
 */
export function ConversationList({ label, layout = "compact", empty, children }: ConversationListProps) {
  const root = useRef<HTMLDivElement>(null);
  const rows = Children.toArray(children).filter(isValidElement) as ReactElement<ConversationRowProps>[];
  const selected = rows.findIndex((row) => row.props.selected);
  const selectedKey = selected < 0 ? "" : String(rows[selected]?.key ?? selected);
  // A folha segue a linha também quando a lista reordena (mensagem nova sobe a conversa).
  useSlidingIndicator(root, `${layout}:${selected}:${rows.length}:${selectedKey}`);
  useEffect(() => {
    root.current?.querySelector<HTMLElement>(':scope > [data-on="true"]')?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
  }, [selectedKey]);

  if (rows.length === 0) return <div className={s.empty} role="status">{empty}</div>;

  function walk(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    const current = (event.target as HTMLElement).closest<HTMLElement>("[data-row]");
    let next = current ? (event.key === "ArrowDown" ? current.nextElementSibling : current.previousElementSibling) : null;
    while (next && !next.hasAttribute("data-row")) next = event.key === "ArrowDown" ? next.nextElementSibling : next.previousElementSibling;
    const target = next?.querySelector<HTMLElement>("button");
    if (!target) return;
    event.preventDefault();
    target.focus();
  }

  return <LayoutContext.Provider value={layout}>
    <div ref={root} className={s.root} role="list" aria-label={label} data-slide="" data-layout={layout} onKeyDown={walk}>
      <span data-ind="" aria-hidden="true" className={s.sheet} />
      {children}
    </div>
  </LayoutContext.Provider>;
}

export interface ConversationRowChannel {
  icon: IconName;
  /** Nome da caixa (a conexão: «WhatsApp Vendas») ou do canal. */
  label: string;
}

export interface ConversationRowProps {
  /** Pessoa da conversa. */
  name: string;
  avatarUrl?: string | null;
  /** Assunto. */
  title: string;
  /** Começo da última mensagem — só na lista larga. */
  snippet?: string | null;
  /** Quando foi a última mensagem («agora», «14 min», «3 d»). */
  time: string;
  /** A mesma data em ISO, para o <time>. */
  dateTime?: string;
  /** Caixas da pessoa nesta lista, a mais recente primeiro: mostra os ícones e o nome da primeira. */
  channels?: readonly ConversationRowChannel[];
  /** Quem cuida: responsável ou equipe. */
  owner?: string | null;
  /** Prazo da primeira resposta como sinal: ponto + texto curto («No prazo», «Vencido»). */
  sla?: { tone: SignalTone; label: string; percent?: number; state?: "on_track" | "due_soon" | "breached" } | null;
  /** Mensagem da pessoa ainda não vista: nome e assunto em tinta 1, ponto de carvão ao lado da hora. */
  unread?: boolean;
  priority?: boolean;
  selected?: boolean;
  /** Posição na lista: a entrada em cascata usa 30 ms por linha. */
  index?: number;
  onSelect: () => void;
}

export function ConversationRow({ name, avatarUrl, title, snippet, time, dateTime, channels = [], owner, sla, unread = false, priority = false, selected = false, index, onSelect }: ConversationRowProps) {
  const layout = useContext(LayoutContext);
  const wide = layout === "wide";
  const [primary] = channels;
  const channel = primary ? <span className={s.channel}>
    {channels.slice(0, 3).map((item, position) => <Icon key={`${item.icon}-${position}`} name={item.icon} />)}
    <span className={s.channelLabel}>{primary.label}</span>
  </span> : null;
  const signal = sla ? <span className={s.sla}>{typeof sla.percent === "number" ? <SlaProgress compact percent={sla.percent} state={sla.state ?? "on_track"} label={sla.label} /> : <Signal tone={sla.tone}>{sla.label}</Signal>}</span> : null;
  const when = <span className={s.when}>
    <time className={s.time} {...(dateTime ? { dateTime } : {})}>{time}</time>
    {unread && <span className={s.dot} aria-hidden="true" />}
  </span>;
  const subject = <>
    {priority && <span className={s.star} role="img" aria-label="Prioritária"><Icon name="star" /></span>}
    <span className={s.subject}>{title}</span>
  </>;
  return <div role="listitem" data-row="" data-on={selected} data-unread={unread || undefined} className={s.item} style={index === undefined ? undefined : { "--i": index } as CSSProperties}>
    <button type="button" className={s.row} aria-current={selected ? "true" : undefined} onClick={onSelect}>
      {unread && <span className={s.hidden}>Não lida. </span>}
      <span className={s.avatar}><Avatar name={name} src={avatarUrl ?? null} size={wide ? "small" : "medium"} /></span>
      {wide ? <>
        <span className={s.name}>{name}</span>
        <span className={s.line}>{subject}{snippet && <><span className={s.dash} aria-hidden="true">—</span><span className={s.snippet}>{snippet}</span></>}</span>
        {channel}
        {signal}
        {when}
      </> : <>
        <span className={s.line}><span className={s.name}>{name}</span>{when}</span>
        <span className={s.line}>{subject}</span>
        <span className={s.meta}>
          {channel}
          {channel && owner && <span aria-hidden="true">·</span>}
          {owner && <span className={s.owner}>{owner}</span>}
          {signal}
        </span>
      </>}
    </button>
  </div>;
}

export interface ConversationListHeaderProps {
  title: ReactNode;
  /** Quantas conversas a lista tem: mono, ao lado do título, na mesma linha de base. */
  count?: number;
  /** Ordenação e formato da lista (Select de filtro, ViewSwitcher). */
  actions?: ReactNode;
}

/** Cabeçalho da lista: título 15/500 com a contagem em mono e as ações na mesma linha; o título começa na coluna dos avatares. */
export function ConversationListHeader({ title, count: total, actions }: ConversationListHeaderProps) {
  return <header className={s.header}>
    <h2 className={s.title}><span className={s.titleText}>{title}</span>{total !== undefined && <span className={s.count}>{count.format(total)}</span>}</h2>
    {actions && <div className={s.actions}>{actions}</div>}
  </header>;
}
