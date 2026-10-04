import type { ReactNode } from "react";
import s from "./CollectionHeader.module.css";

export function CollectionHeader({ label, selection, count, value, valueLabel = "Valor dos negócios", actions }: {
  label: string; selection: ReactNode; count: string; value: string; valueLabel?: string; actions?: ReactNode;
}) {
  return <header className={s.root} aria-label={label}>
    <h1 className={s.selection}>{selection}</h1>
    <div className={s.summary} aria-live="polite">
      <span className={s.count}>{count}</span>
      <span className={s.metric}><span className={s.label}>{valueLabel}</span><strong className={s.value}>{value}</strong></span>
    </div>
    {actions && <div className={s.actions}>{actions}</div>}
  </header>;
}
