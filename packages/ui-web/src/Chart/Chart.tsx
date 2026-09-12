import { useId, useState, type ReactNode } from "react";
import { ResponsiveContainer, ComposedChart, CartesianGrid, XAxis, YAxis, Tooltip, Line, Area, Bar, PieChart, Pie, Cell } from "recharts";
import { lightTheme } from "@spark/tokens/native-theme";
import { Card, CardContentState, type CardState } from "../Card/Card.js";
import { Button } from "../Button/Button.js";
import s from "./Chart.module.css";
export type ChartColor = 1 | 2 | 3 | 4 | 5;
export interface ChartSeries { key: string; label: string; color: ChartColor }
export interface ChartDatum { label: string; [key: string]: string | number | null }
export interface DataChartProps { title: string; description?: string; data: ChartDatum[]; series: readonly ChartSeries[]; kind?: "line" | "area" | "bar"; stacked?: boolean; state?: CardState; formatValue?: (value: number) => string; onRetry?: () => void; actions?: ReactNode }
const defaultFormat = (value: number) => new Intl.NumberFormat("pt-BR").format(value);
const color = (index: ChartColor) => `var(--ui-chart${index})`;
function display(value: string | number | null | undefined, format: (value:number)=>string) { return typeof value === "number" && Number.isFinite(value) ? format(value) : "—"; }
export function DataChart({ title, description, data, series, kind = "line", stacked = false, state = "ready", formatValue = defaultFormat, onRetry, actions }: DataChartProps) {
  const [hidden, setHidden] = useState<Set<string>>(()=>new Set());
  const [table, setTable] = useState(false);
  const tableId = useId();
  const effectiveState = state === "ready" && (!data.length || !series.some(v=>data.some(row=>typeof row[v.key] === "number" && Number.isFinite(row[v.key])))) ? "empty" : state;
  return <Card title={title} {...(description !== undefined ? {description} : {})} actions={actions}>
    <CardContentState state={effectiveState} onRetry={onRetry} loadingVariant="chart">
      <div className={s.chart}>
        <ResponsiveContainer width="100%" height="100%"><ComposedChart data={data} accessibilityLayer margin={{right:parseFloat(lightTheme["space-8"])}}>
          <CartesianGrid vertical={false} stroke="var(--color-line)" />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fontSize:lightTheme["ui-chartTickSize"],fill:"var(--color-inkMuted)"}} />
          <YAxis axisLine={false} tickLine={false} width={lightTheme["ui-chartAxisWidth"]} tickFormatter={formatValue} tick={{fontSize:lightTheme["ui-chartTickSize"],fill:"var(--color-inkMuted)"}} />
          <Tooltip contentStyle={{background:"var(--color-surface)",border:"var(--ui-hairline) solid var(--color-line)",borderRadius:"var(--radius-sm)",boxShadow:"var(--ui-popupShadow)"}} formatter={value=>typeof value === "number" ? formatValue(value) : "—"} />
          {series.map(v=>kind === "bar" ? <Bar key={v.key} dataKey={v.key} name={v.label} fill={color(v.color)} hide={hidden.has(v.key)} {...(stacked ? {stackId:"total"} : {})} isAnimationActive={false} /> : kind === "area" ? <Area key={v.key} dataKey={v.key} name={v.label} stroke={color(v.color)} fill={color(v.color)} fillOpacity={lightTheme["ui-chartFillOpacity"]} strokeWidth={lightTheme["ui-chartStroke"]} hide={hidden.has(v.key)} connectNulls={false} isAnimationActive={false} /> : <Line key={v.key} dataKey={v.key} name={v.label} stroke={color(v.color)} strokeWidth={lightTheme["ui-chartStroke"]} dot={false} hide={hidden.has(v.key)} connectNulls={false} isAnimationActive={false} />)}
        </ComposedChart></ResponsiveContainer>
      </div>
      <div className={s.legend} aria-label={`Séries de ${title}`}>{series.map(v=><button key={v.key} type="button" className={s.legendItem} aria-pressed={!hidden.has(v.key)} onClick={()=>setHidden(previous=>{const next=new Set(previous);if(next.has(v.key))next.delete(v.key);else next.add(v.key);return next;})}><span className={s.swatch} style={{background:color(v.color)}} />{v.label}</button>)}</div>
      <Button size="sm" variant="ghost" aria-expanded={table} aria-controls={tableId} onClick={()=>setTable(v=>!v)}>{table ? "Ocultar dados" : "Ver dados"}</Button>
      <div id={tableId} hidden={!table} className={s.tableScroll}><table className={s.table}><caption>{title}</caption><thead><tr><th scope="col">Período</th>{series.map(v=><th key={v.key} scope="col">{v.label}</th>)}</tr></thead><tbody>{data.map((row,index)=><tr key={`${row.label}-${index}`}><th scope="row">{row.label}</th>{series.map(v=><td key={v.key}>{display(row[v.key],formatValue)}</td>)}</tr>)}</tbody></table></div>
    </CardContentState>
  </Card>;
}
export interface DonutDatum { id: string; label: string; value: number; color: ChartColor }
export function DonutChart({ title, data, state = "ready", onRetry, formatValue = defaultFormat }: { title: string; data: DonutDatum[]; state?: CardState; onRetry?: () => void; formatValue?: (value:number)=>string }) {
  const hasValues = data.some(d=>d.value>0);
  return <Card title={title}><CardContentState state={state === "ready" && !data.length ? "empty" : state} onRetry={onRetry} loadingVariant="donut">
    {hasValues ? <div className={s.chart}><ResponsiveContainer width="100%" height="100%"><PieChart accessibilityLayer><Pie data={data} dataKey="value" nameKey="label" innerRadius="60%" outerRadius="85%" isAnimationActive={false}>{data.map(d=><Cell key={d.id} fill={color(d.color)} stroke="var(--color-surface)" />)}</Pie><Tooltip formatter={value=>typeof value === "number" ? formatValue(value) : "—"} /></PieChart></ResponsiveContainer></div> : <p className={s.zero}>Nenhuma ocorrência registrada</p>}
    <ul className={s.donutLegend} aria-label={title}>{data.map(d=><li key={d.id}><span className={s.swatch} style={{background:color(d.color)}} /><span>{d.label}</span><strong>{formatValue(d.value)}</strong></li>)}</ul>
  </CardContentState></Card>;
}
