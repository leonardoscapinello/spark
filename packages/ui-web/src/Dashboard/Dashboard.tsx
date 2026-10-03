import type { ReactNode } from "react";
import { SegmentedControl } from "../SegmentedControl/SegmentedControl.js";
import { Select, type SelectOption } from "../Select/Select.js";
import s from "./Dashboard.module.css";
export { KpiCard, type KpiCardProps, type KpiDelta } from "./KpiCard.js";

/** Grade de KPIs (minmax 220, gap 12) ou de gráficos (minmax 320, gap 16) — origem: Dados, "Grid de KPIs". */
export function DashboardGrid({ children, metrics = false }: { children: ReactNode; metrics?: boolean }) { return <div className={s.grid} data-metrics={metrics || undefined}>{children}</div>; }

/** Período do painel: até quatro opções viram segmentado (a folha desliza); mais que isso, lista. */
export function DashboardToolbar({ title, period, periods, onPeriodChange, children }: { title?: string; period: string; periods: readonly SelectOption[]; onPeriodChange: (period: string) => void; children?: ReactNode }) {
  return <div className={s.toolbar}>
    {title && <h2>{title}</h2>}
    <div className={s.filters}>
      {periods.length <= 4
        ? <SegmentedControl label="Período do painel" value={period} options={periods.map((option) => ({ value: option.value, label: option.label }))} onValueChange={onPeriodChange} />
        : <Select appearance="filter" label="Período do painel" value={period} options={periods} onValueChange={(value) => { if (value !== null) onPeriodChange(value); }} />}
      {children}
    </div>
  </div>;
}
