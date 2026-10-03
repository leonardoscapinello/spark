import { useState, type ReactNode } from "react";
import { Button } from "../Button/Button.js";
import { Badge, IndeterminateBar } from "../Feedback/Feedback.js";
import { Icon, type IconName } from "../Icon/Icon.js";
import { IconTile } from "../IconTile/IconTile.js";
import styles from "./EmptyState.module.css";

export interface EmptyStateProps {
  icon: IconName;
  title: string;
  description: string;
  action?: ReactNode;
  secondaryAction?: ReactNode;
  /** default: cartão centrado (origem: Feedback, "Estado vazio") · onboarding: faixa de primeiro passo · featured: primeiro uso com ilustração. */
  variant?: "default" | "onboarding" | "featured";
}

/** Estado vazio (§11): disco cavado de 48, título 500 15, uma frase de 12 e no máximo uma ação de tinta. */
export function EmptyState({ icon, title, description, action, secondaryAction, variant = "default" }: EmptyStateProps) {
  return <section className={styles.root} data-variant={variant} aria-label={title}>
    {variant === "featured" ? <span className={styles.art} aria-hidden="true"><FeaturedArt icon={icon} /></span> : <IconTile icon={icon} size="xl" tone="muted" />}
    <h2>{title}</h2>
    <p>{description}</p>
    {(action || secondaryAction) && <div className={styles.actions}>{action}{secondaryAction}</div>}
  </section>;
}

/** A ilustração do primeiro uso é uma folha erguida com o esboço do que vai aparecer ali — tinta e papel, sem cor. */
function FeaturedArt({ icon }: { icon: IconName }) {
  const kind = icon === "chart" ? "chart"
    : icon === "bolt" || icon === "briefcase" ? "flow"
    : icon === "calendar" ? "calendar"
    : icon === "mail" || icon === "message" ? "conversation"
    : "record";

  return <span className={styles.artCard} data-art={kind}>
    <span className={styles.mobileArtSymbol}><IconTile icon={icon} size="xl" /></span>
    {kind === "chart" && <span className={styles.artChart}><span /><span /><span /><span /><span /></span>}
    {kind === "flow" && <span className={styles.artFlow}>
      <span className={styles.artFlowNode}><Icon name={icon} /></span>
      <span className={styles.artFlowConnector} />
      <span className={styles.artFlowNode}><Icon name="check" /></span>
    </span>}
    {kind === "calendar" && <span className={styles.artCalendar}>
      <span className={styles.artCalendarHeader}><Icon name="calendar" /><span /><span /></span>
      <span className={styles.artCalendarDays}>{Array.from({ length: 12 }, (_, index) => <span key={index} data-active={index === 8 || undefined} />)}</span>
    </span>}
    {kind === "conversation" && <span className={styles.artConversation}>
      <span><Icon name={icon} /><span><span /><span /></span></span>
      <span><Icon name="check" /><span><span /><span /></span></span>
    </span>}
    {kind === "record" && <span className={styles.artRecord}>
      <IconTile icon={icon} />
      <span className={styles.artLines}><span /><span /><span /></span>
      <span className={styles.artFoot}><span /><span /></span>
    </span>}
  </span>;
}

export type PageStateKind = "not-found" | "offline" | "forbidden" | "error";

const PAGE_STATE: Record<PageStateKind, { icon: IconName; title: string; description: string; retryTitle: string; retryDescription: string; retryLabel: string; retryingLabel: string }> = {
  "not-found": { icon: "search", title: "Página não encontrada", description: "O link pode ter mudado. Volte ao início ou use a busca.", retryTitle: "", retryDescription: "", retryLabel: "", retryingLabel: "" },
  offline: { icon: "plug", title: "Sem conexão", description: "Mostrando o que ficou salvo neste dispositivo. Tentamos de novo sozinhos.", retryTitle: "Reconectando…", retryDescription: "Sincronizando o que ficou pendente.", retryLabel: "Reconectar", retryingLabel: "Reconectando…" },
  forbidden: { icon: "lock", title: "Sem permissão", description: "Seu grupo de acesso não permite ver esta área. Peça acesso a quem administra a organização.", retryTitle: "", retryDescription: "", retryLabel: "", retryingLabel: "" },
  error: { icon: "alert", title: "Algo deu errado", description: "Não conseguimos carregar estas informações. O resto da tela segue normal.", retryTitle: "Tentando de novo…", retryDescription: "Recarregando só este bloco.", retryLabel: "Tentar de novo", retryingLabel: "Tentando…" },
};

export interface PageStateProps {
  kind: PageStateKind;
  title?: string;
  description?: string;
  /** Ação própria (voltar ao início, pedir acesso). Em erro e sem conexão, prefira onRetry. */
  action?: ReactNode;
  /** Erro e sem conexão: tentar de novo. Se devolver uma promessa, o cartão mostra a espera até ela terminar. */
  onRetry?: () => void | Promise<unknown>;
  /** Espera controlada por quem chama (ex.: a lista recarregando). */
  retrying?: boolean;
}

/**
 * Estado de página (origem: Padrões, "Estados de página"): cartão de raio 40,
 * disco de estado de 44, título 16 e uma frase. Erro e sem conexão tentam de
 * novo no mesmo lugar — o ícone gira, a barra corre — e o resto da tela segue.
 */
export function PageState({ kind, title, description, action, onRetry, retrying = false }: PageStateProps) {
  const copy = PAGE_STATE[kind];
  const [pending, setPending] = useState(false);
  const busy = retrying || pending;
  const canRetry = Boolean(onRetry) && (kind === "error" || kind === "offline");
  async function retry() {
    if (!onRetry || busy) return;
    const result = onRetry();
    if (!result || typeof (result as Promise<unknown>).then !== "function") return;
    setPending(true);
    try { await result; } catch { /* quem chama mostra o novo erro */ } finally { setPending(false); }
  }
  return <section className={styles.state} data-kind={kind} data-busy={busy || undefined} aria-label={busy ? copy.retryTitle : title ?? copy.title} aria-busy={busy || undefined}>
    <IconTile icon={copy.icon} size="lg" tone={busy ? "muted" : kind === "error" ? "danger" : "neutral"} />
    <h2>{busy ? copy.retryTitle : title ?? copy.title}</h2>
    <p>{busy ? copy.retryDescription : description ?? copy.description}</p>
    <div className={styles.stateActions}>
      {kind === "offline" && !busy && <Badge tone="warning">Offline · cache</Badge>}
      {canRetry && <Button variant="secondary" loading={busy} icon={<Icon name="refresh" />} onClick={() => void retry()}>{busy ? copy.retryingLabel : copy.retryLabel}</Button>}
      {action}
    </div>
    {busy && <IndeterminateBar label={copy.retryTitle} />}
  </section>;
}
