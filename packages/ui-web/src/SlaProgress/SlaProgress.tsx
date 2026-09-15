import type { CSSProperties } from "react";
import styles from "./SlaProgress.module.css";

export interface SlaProgressProps { percent: number; label: string; state: "on_track" | "due_soon" | "breached"; compact?: boolean }
export function SlaProgress({ percent, label, state, compact = false }: SlaProgressProps) {
  const bounded = Math.max(0, Math.min(100, percent));
  return <div className={styles.root} data-state={state} data-compact={compact || undefined} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={bounded} aria-valuetext={label}>
    <span className={styles.copy}>{label}</span>
    <span className={styles.track}><span className={styles.fill} style={{ "--sla-progress": `${bounded}%` } as CSSProperties} /></span>
  </div>;
}
