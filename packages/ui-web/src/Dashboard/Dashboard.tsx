import type { ReactNode } from "react";
import { Select, type SelectOption } from "../Select/Select.js";
import s from "./Dashboard.module.css";
export function DashboardGrid({ children, metrics = false }: { children: ReactNode; metrics?: boolean }) { return <div className={s.grid} data-metrics={metrics || undefined}>{children}</div>; }
export function DashboardToolbar({ title, period, periods, onPeriodChange, children }: { title: string; period: string; periods: readonly SelectOption[]; onPeriodChange: (period:string)=>void; children?: ReactNode }) {
  return <header className={s.toolbar}><h2>{title}</h2><div className={s.filters}><Select label="Período do dashboard" value={period} options={periods} onValueChange={v=>{if(v!==null)onPeriodChange(v);}} />{children}</div></header>;
}
