import { Children, useLayoutEffect, useRef, type ReactNode } from "react";
import { Avatar } from "../Avatar/Avatar.js";
import { Icon, type IconName } from "../Icon/Icon.js";
import s from "./Chat.module.css";

export type MessageDirection = "inbound" | "outbound" | "internal";
export type MessageStatus = "received" | "draft" | "queued" | "sent" | "delivered" | "read" | "failed";

const STATUS: Readonly<Record<MessageStatus, string>> = {
  received: "Recebida",
  draft: "Rascunho",
  queued: "Na fila",
  sent: "Enviada",
  delivered: "Entregue",
  read: "Lida",
  failed: "Falhou",
};

/** Situação da mensagem em português — nunca o código técnico (received, delivered). */
export function messageStatusLabel(status: MessageStatus): string {
  return STATUS[status];
}

export interface ChatThreadProps {
  /** Nome acessível do histórico («Conversa com Carla»). */
  label: string;
  /** Muda quando outra conversa abre: a rolagem volta ao fim sem animar. */
  threadKey?: string;
  /** Sem mensagens: frase curta no centro do histórico. */
  empty?: ReactNode;
  children?: ReactNode;
}

/**
 * Histórico da conversa (origem: Chat — atendimento, §17): coluna com 10px
 * entre as mensagens, colada no fim quando há pouco. Mensagem nova rola até o
 * fim só se quem lê já estava perto dele — não arranca ninguém do meio do
 * histórico.
 */
export function ChatThread({ label, threadKey, empty, children }: ChatThreadProps) {
  const root = useRef<HTMLDivElement>(null);
  // O histórico pode chegar depois da troca de conversa: a primeira vez que ele
  // tem mensagens vai direto ao fim, sem animar.
  const opened = useRef<{ key: string | undefined; filled: boolean }>({ key: undefined, filled: false });
  const total = Children.count(children);
  useLayoutEffect(() => {
    const element = root.current;
    if (!element) return;
    if (opened.current.key !== threadKey) opened.current = { key: threadKey, filled: false };
    const first = !opened.current.filled && total > 0;
    if (total > 0) opened.current.filled = true;
    const distance = element.scrollHeight - element.scrollTop - element.clientHeight;
    if (first || distance < element.clientHeight / 2) element.scrollTo?.({ top: element.scrollHeight, behavior: first ? "auto" : "smooth" });
  }, [threadKey, total]);
  return <div ref={root} className={s.thread} role="log" aria-label={label} aria-live="polite" tabIndex={0}>{total > 0 ? children : empty && <p className={s.threadEmpty}>{empty}</p>}</div>;
}

/** Separador de dia («Hoje», «Ontem», «12 de set.»): pílula cavada no centro. */
export function ChatDay({ children }: { children: ReactNode }) {
  return <div className={s.day}><span>{children}</span></div>;
}

export interface MessageBubbleProps {
  direction: MessageDirection;
  /** Quem escreveu: a pessoa, alguém da equipe. */
  author: string;
  /** Hora curta («14:32»). */
  time?: string;
  /** A mesma hora em ISO, para o <time>. */
  dateTime?: string;
  /** Caixa por onde a mensagem passou: glifo + nome. A conversa é da pessoa, não do canal. */
  channel?: { icon: IconName; label: string } | null;
  /** Situação da mensagem enviada: recibo ✓ / ✓✓ (lida em azul), «Na fila», «Falhou». */
  status?: MessageStatus;
  /** Chegou agora: entra com movimento. O histórico já aparece pousado. */
  fresh?: boolean;
  /** Imagem, vídeo, áudio ou arquivo (ChatAttachment). */
  attachment?: ReactNode;
  children?: ReactNode;
}

/**
 * Bolha (origem: Chat — atendimento, §17). Da pessoa: folha pousada à
 * esquerda, raio 22 com o canto de origem em 8. Da equipe: carvão à direita.
 * Nota interna: papel de aviso suave, só para a equipe. Embaixo, uma linha de
 * 11 em tinta 3: autor · hora · caixa e o recibo.
 */
export function MessageBubble({ direction, author, time, dateTime, channel, status, fresh = false, attachment, children }: MessageBubbleProps) {
  const hasText = children !== undefined && children !== null && children !== "";
  return <article className={s.message} data-direction={direction} data-fresh={fresh || undefined}>
    {(hasText || attachment) && <div className={s.bubble}>
      {hasText && <div className={s.text}>{children}</div>}
      {attachment && <div className={s.attachment}>{attachment}</div>}
    </div>}
    <footer className={s.meta}>
      <span className={s.author}>{author}</span>
      {time && <><span aria-hidden="true">·</span><time {...(dateTime ? { dateTime } : {})}>{time}</time></>}
      {direction === "internal"
        ? <><span aria-hidden="true">·</span><span className={s.note}><Icon name="lock" />Nota interna</span></>
        : channel && <><span aria-hidden="true">·</span><span className={s.inbox}><Icon name={channel.icon} /><span className={s.inboxLabel}>{channel.label}</span></span></>}
      {direction === "outbound" && status && <MessageReceipt status={status} />}
    </footer>
  </article>;
}

/**
 * Recibo da mensagem enviada (§17): um ✓ enviada, dois ✓✓ entregue, dois em
 * azul lida; o segundo traço se desenha em 700 ms. Na fila é um relógio;
 * falha é texto em vermelho, porque pede ação.
 */
export function MessageReceipt({ status }: { status: MessageStatus }) {
  const label = messageStatusLabel(status);
  if (status === "failed") return <span className={s.failed}><Icon name="alert" />{label}</span>;
  if (status === "queued" || status === "draft") return <span className={s.receipt} role="img" aria-label={label} title={label}><Icon name="clock" /></span>;
  if (status === "received") return null;
  return <span className={s.receipt} data-status={status} role="img" aria-label={label} title={label}>
    <svg viewBox="0 0 22 14" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1.5 7.5l3.6 3.6L12.5 3.2" />
      <path className={s.second} d="M9.2 10.6l.5.5L20.5 3.2" />
    </svg>
  </span>;
}

/** «Fulana está digitando…»: três pontos que respiram (§17, digitando) e o texto em tinta 3. */
export function ChatTyping({ children }: { children: ReactNode }) {
  return <div className={s.typing} role="status">
    <span className={s.dots} aria-hidden="true"><span /><span /><span /></span>
    <span className={s.typingText}>{children}</span>
  </div>;
}

export type ChatAttachmentState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; url: string; mimeType: string; name: string };

/** Anexo dentro da bolha: imagem, vídeo e áudio tocam ali mesmo; o resto vira link para baixar. */
export function ChatAttachment({ state }: { state: ChatAttachmentState }) {
  if (state.status === "loading") return <span className={s.fileNote} aria-busy="true">Carregando anexo…</span>;
  if (state.status === "error") return <span className={s.fileNote}>Não foi possível abrir o anexo.</span>;
  if (state.mimeType.startsWith("image/")) return <img className={s.media} src={state.url} alt={state.name} loading="lazy" />;
  if (state.mimeType.startsWith("video/")) return <video className={s.media} src={state.url} controls preload="metadata" />;
  if (state.mimeType.startsWith("audio/")) return <audio className={s.audio} src={state.url} controls preload="metadata" />;
  return <a className={s.file} href={state.url} target="_blank" rel="noopener noreferrer"><Icon name="file" /><span>{state.name}</span></a>;
}

export interface ConversationHeaderProps {
  name: string;
  avatarUrl?: string | null;
  /** Linha de apoio em tinta 3: assunto e situação. */
  subtitle?: ReactNode;
  /** Canais da pessoa (ChannelChip), embaixo do nome: todas as caixas por onde ela fala. */
  channels?: ReactNode;
  /** Antes do avatar: voltar para a lista no celular. */
  leading?: ReactNode;
  /** Quem mais está vendo a conversa (ViewerStack). */
  presence?: ReactNode;
  /** Ações da conversa: detalhes, prioridade, fechar. */
  actions?: ReactNode;
}

/**
 * Cabeçalho da conversa (§17, «cab»): avatar de 40, nome 15/500 e a linha de
 * apoio em tinta 3; embaixo, os canais da pessoa. A conversa é da pessoa —
 * o cabeçalho mostra todas as caixas por onde ela fala, não só uma.
 */
export function ConversationHeader({ name, avatarUrl, subtitle, channels, leading, presence, actions }: ConversationHeaderProps) {
  return <header className={s.header}>
    <div className={s.headerLeading}>{leading}<Avatar name={name} src={avatarUrl ?? null} size="large" /></div>
    <div className={s.identity}>
      <h2 className={s.name}>{name}</h2>
      {subtitle && <p className={s.subtitle}>{subtitle}</p>}
      {channels && <div className={s.channels} role="group" aria-label={`Canais de ${name}`}>{channels}</div>}
    </div>
    {(presence || actions) && <div className={s.headerActions}>{presence}{actions}</div>}
  </header>;
}
