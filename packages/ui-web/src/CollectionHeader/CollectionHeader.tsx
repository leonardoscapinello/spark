import type { ReactNode } from "react";
import s from "./CollectionHeader.module.css";

export function CollectionHeader({ label, selection, count, value, valueLabel = "Valor dos negócios", controls, actions }: {
  label: string; selection: ReactNode; count: string; value: string; valueLabel?: string; controls?: ReactNode; actions?: ReactNode;
}) {
  return <header className={s.root} aria-label={label}>
    <h1 className={s.selection}>{selection}</h1>
    <div className={s.summary} aria-live="polite">
      <span className={s.count}>{count}</span>
      <strong className={s.value} title={valueLabel} aria-label={`${valueLabel}: ${value}`}>{value}</strong>
    </div>
    {controls && <div className={s.controls}>{controls}</div>}
    {actions && <div className={s.actions}>{actions}</div>}
  </header>;
}
