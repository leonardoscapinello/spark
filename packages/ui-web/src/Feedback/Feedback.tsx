import type { ComponentProps, ReactNode } from "react";
import { Chip } from "../Chip/Chip.js";
import { Icon, type IconName } from "../Icon/Icon.js";
import { Notification } from "../Notification/Notification.js";
import styles from "./Feedback.module.css";

export type FeedbackTone = "neutral" | "info" | "success" | "warning" | "danger";

const DOT: Record<FeedbackTone, string> = { neutral: "var(--tx3)", info: "var(--in)", success: "var(--ok)", warning: "var(--wa)", danger: "var(--er)" };

/**
 * Selo — desenhado pelo Chip (dono único de etiqueta, selo e status). `dot`
 * leva a cor para um ponto de 6px e deixa a etiqueta neutra: é assim que etapa
 * e status aparecem numa lista sem pintar a área. `dotColor` aceita a cor que
 * vem do dado (etapa de funil com cor própria).
 */
export function Badge({ tone = "neutral", dot, dotColor, children }: { tone?: FeedbackTone | "ink"; dot?: boolean | FeedbackTone; dotColor?: string; children: ReactNode }) {
  const point = dotColor ?? (typeof dot === "string" ? DOT[dot] : dot);
  return <Chip tone={tone} {...(point !== undefined ? { dot: point } : {})}>{children}</Chip>;
}

/** Etiqueta com ícone ou removível — também desenhada pelo Chip. */
export function Tag({ children, icon, onRemove, removeLabel }: { children: ReactNode; icon?: IconName; onRemove?: () => void; removeLabel?: string }) {
  return <Chip {...(icon ? { icon } : {})} {...(onRemove ? { onRemove } : {})} {...(removeLabel ? { removeLabel } : {})}>{children}</Chip>;
}

const NOTIFICATION_TONE = { neutral: "info", info: "info", success: "success", warning: "warning", danger: "error" } as const;

/**
 * Alerta inline — desenhado pela Notification (folha de raio 32, ícone de 28
 * na cor do estado). O invólucro só anuncia: erro interrompe (alert), o resto
 * informa (status).
 */
export function Alert({ tone = "neutral", title, children, action }: { tone?: FeedbackTone; title: string; children?: string; action?: ReactNode }) {
  return <div role={tone === "danger" ? "alert" : "status"}><Notification title={title} tone={NOTIFICATION_TONE[tone]} {...(children ? { description: children } : {})} {...(action ? { actions: action } : {})} /></div>;
}

/**
 * Mensagem curta de formulário (origem: Padrões, "Login"): ícone de 14 e uma
 * frase de 12 na cor do estado. Entra abrindo espaço, nunca seca.
 */
export function FormMessage({ tone = "danger", children }: { tone?: "danger" | "success" | "info"; children: ReactNode }) {
  return <p role={tone === "danger" ? "alert" : "status"} className={styles.formMessage} data-tone={tone}>
    <span className={styles.formMessageText}>
      <span className={styles.formMessageIcon} aria-hidden="true"><Icon name={tone === "danger" ? "alert" : tone === "success" ? "checkCircle" : "info"} /></span>
      <span>{children}</span>
    </span>
  </p>;
}

/** Linha de esqueleto (§9): 10 de altura, brilho que passa em 1,4 s. A largura e
 * a altura vêm de quem usa; o raio acompanha (pílula em linha, folha em bloco).
 * `round` é o lugar de um item redondo (avatar, item do trilho). */
export function Skeleton({ className, round = false, ...props }: ComponentProps<"div"> & { round?: boolean | undefined }) {
  return <div aria-hidden="true" data-round={round || undefined} className={[styles.skeleton, className].filter(Boolean).join(" ")} {...props} />;
}

export { Spinner } from "../Spinner/Spinner.js";

/** Barra indeterminada (origem: Progresso): 3 de altura, a tinta corre em 1,1 s. */
export function IndeterminateBar({ label }: { label: string }) {
  return <span className={styles.indeterminate} role="progressbar" aria-label={label}><span /></span>;
}
