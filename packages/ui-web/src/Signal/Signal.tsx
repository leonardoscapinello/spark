import type { ReactNode } from "react";
import s from "./Signal.module.css";

export type SignalTone = "neutral" | "info" | "success" | "warning" | "danger";

export interface SignalProps {
  /** A cor do ponto é o estado; o texto fica sempre em tinta 3. */
  tone?: SignalTone;
  children?: ReactNode;
  /** Só o que é ao vivo pulsa. */
  live?: boolean;
  title?: string;
}

/**
 * Status pequeno (prazo, próximo passo, SLA, presença): ponto de 7px na cor do
 * estado + texto curto em tinta 3. Nunca ocupa uma linha inteira nem pinta a
 * área — é sinal, não faixa.
 */
export function Signal({ tone = "neutral", children, live = false, title }: SignalProps) {
  return <span className={s.root} data-tone={tone} title={title}>
    <span className={s.dot} aria-hidden="true">{live && <span className={s.ping} />}</span>
    {children !== undefined && children !== null && <span className={s.text}>{children}</span>}
  </span>;
}
