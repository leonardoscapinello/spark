import type { ReactNode } from "react";
import styles from "./SlaProgress.module.css";

type SlaState = "on_track" | "due_soon" | "breached";

export interface SlaRingProps { percent: number; state: SlaState; size?: "small" | "large"; children?: ReactNode }
/** Anel regressivo do prazo: começa cheio e esvazia conforme `percent` (consumido) sobe. Decorativo — quem usa dá o nome acessível. */
export function SlaRing({ percent, state, size = "small", children }: SlaRingProps) {
  const remaining = 100 - Math.max(0, Math.min(100, percent));
  return <span className={styles.ring} data-state={state} data-size={size} aria-hidden="true">
    <svg viewBox="0 0 20 20" focusable="false">
      <circle className={styles.ringTrack} cx="10" cy="10" r="8" pathLength={100} />
      {remaining > 0 && <circle className={styles.ringFill} cx="10" cy="10" r="8" pathLength={100} strokeDasharray={`${remaining} 100`} />}
    </svg>
    {children}
  </span>;
}

export interface SlaProgressProps {
  percent: number;
  label: string;
  state: SlaState;
  /** Uma linha só: anel pequeno + percentual restante. Rótulo, status e detalhe ficam no nome acessível. */
  compact?: boolean;
  status?: string;
  detail?: string;
}
export function SlaProgress({ percent, label, state, compact = false, status, detail }: SlaProgressProps) {
  const bounded = Math.max(0, Math.min(100, percent));
  // Regressivo: mostra o que resta do prazo, não o que já foi consumido.
  const shown = state === "breached" || bounded >= 100 ? "Vencido" : `${Math.round(100 - bounded)}%`;
  const accessibleLabel = [label, status, detail].filter(Boolean).join(" · ");
  return <div className={styles.root} data-state={state} data-compact={compact || undefined} role="progressbar" aria-label={accessibleLabel} aria-valuemin={0} aria-valuemax={100} aria-valuenow={bounded} aria-valuetext={`${shown === "Vencido" ? shown : `${shown} restante`} · ${accessibleLabel}`}>
    {compact ? <>
      <SlaRing percent={percent} state={state} />
      <span className={styles.percent}>{shown}</span>
    </> : <>
      <SlaRing percent={percent} state={state} size="large"><span className={styles.ringValue}>{shown === "Vencido" ? "0%" : shown}</span></SlaRing>
      <span className={styles.text}>
        <span className={styles.heading}>{label}</span>
        {status && <span className={styles.copy}>{status}</span>}
        {detail && <span className={styles.copy}>{detail}</span>}
      </span>
    </>}
  </div>;
}
