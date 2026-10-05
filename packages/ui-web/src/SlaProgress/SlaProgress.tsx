import type { CSSProperties } from "react";
import styles from "./SlaProgress.module.css";

export interface SlaProgressProps {
  percent: number;
  label: string;
  state: "on_track" | "due_soon" | "breached";
  /** Uma linha só: percentual + trilho curto. Rótulo, status e detalhe ficam no nome acessível. */
  compact?: boolean;
  status?: string;
  detail?: string;
}
export function SlaProgress({ percent, label, state, compact = false, status, detail }: SlaProgressProps) {
  const bounded = Math.max(0, Math.min(100, percent));
  const accessibleLabel = [label, status, detail].filter(Boolean).join(" · ");
  return <div className={styles.root} data-state={state} data-compact={compact || undefined} role="progressbar" aria-label={accessibleLabel} aria-valuemin={0} aria-valuemax={100} aria-valuenow={bounded} aria-valuetext={accessibleLabel}>
    {compact ? <span className={styles.percent}>{Math.round(Math.max(0, percent))}%</span> : <span className={styles.heading}>{label}</span>}
    {!compact && status && <span className={styles.copy}>{status}</span>}
    <span className={styles.track}><span className={styles.fill} style={{ "--sla-progress": `${bounded}%` } as CSSProperties} /></span>
    {!compact && detail && <span className={styles.copy}>{detail}</span>}
  </div>;
}
