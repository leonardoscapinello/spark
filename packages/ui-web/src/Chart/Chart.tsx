import { useId, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { ResponsiveContainer, ComposedChart, CartesianGrid, XAxis, YAxis, Tooltip, Line, Area, Bar, Cell, type TooltipContentProps } from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";
import { lightTheme } from "@spark/tokens/native-theme";
import { Card, CardContentState, type CardState } from "../Card/Card.js";
import { Button } from "../Button/Button.js";
import { useReducedMotion } from "../motion/useReducedMotion.js";
import s from "./Chart.module.css";

/** Pigmento da série, na ordem fixa da identidade: 1 tinta (Identidade) · 2 Ai · 3 Asagi · 4 Kaki · 5 Fuji · 6 Hai ("Outros" e comparação). Verde e vermelho de estado nunca viram série. */
export type ChartColor = 1 | 2 | 3 | 4 | 5 | 6;
export interface ChartSeries { key: string; label: string; color: ChartColor; comparison?: boolean; estimated?: boolean }
export interface ChartDatum { label: string; [key: string]: string | number | null }
export interface DataChartProps { title: string; description?: string; data: ChartDatum[]; series: readonly ChartSeries[]; kind?: "line" | "area" | "bar"; stacked?: boolean; state?: CardState; formatValue?: (value: number) => string; onRetry?: () => void; actions?: ReactNode }
const numberFormatter = new Intl.NumberFormat("pt-BR");
const defaultFormat = (value: number) => numberFormatter.format(value);
const pigment = (index: ChartColor) => `var(--v${index - 1})`;
const seriesColor = (series: ChartSeries) => series.comparison ? "var(--v5)" : pigment(series.color);
const DASH = String(lightTheme["tracejado"]);
const TICK = { fontSize: Number.parseFloat(lightTheme["fs-micro"]), fill: "var(--tx3)" };
const DURATION = Number.parseFloat(lightTheme["t-deliberate"]);
function display(value: string | number | null | undefined, format: (value: number) => string) { return typeof value === "number" && Number.isFinite(value) ? format(value) : "—"; }

/** Dica sobre carvão (origem: Dados, "Gráfico de linha"): raio 18, data em 10,5 a 65%, valor em mono 500 14. */
function ChartTooltip({ active, payload, label, series, format }: { active?: boolean | undefined; payload?: ReadonlyArray<{ dataKey?: unknown; value?: unknown }> | undefined; label?: unknown; series: readonly ChartSeries[]; format: (value: number) => string }) {
  if (!active || !payload?.length) return null;
  const rows = payload.map((entry) => ({ entry, item: series.find((candidate) => candidate.key === entry.dataKey) })).filter((row) => row.item);
  if (!rows.length) return null;
  return <div className={s.tooltip}>
    <span className={s.tipDate}>{String(label ?? "")}</span>
    {rows.map(({ entry, item }) => <span key={String(entry.dataKey)} className={s.tipRow}>
      {rows.length > 1 && <span className={s.tipSwatch} data-comparison={item!.comparison || item!.estimated || undefined} style={{ "--swatch": seriesColor(item!) } as CSSProperties} aria-hidden="true" />}
      {rows.length > 1 && <span className={s.tipName}>{item!.label}</span>}
      <span className={s.tipValue}>{display(typeof entry.value === "number" ? entry.value : null, format)}</span>
    </span>)}
  </div>;
}

/**
 * Gráfico de série (origem: Dados, "Gráfico de linha / área" e "Barras"): a
 * série principal é tinta; comparação é Hai tracejado; grade tracejada em
 * --grid; rótulos em mono 10 tinta 3, com a escala à direita. Barra de uma
 * série é papel cavado e a do ponteiro (ou a última) vira tinta.
 */
export function DataChart({ title, description, data, series, kind = "line", stacked = false, state = "ready", formatValue = defaultFormat, onRetry, actions }: DataChartProps) {
  const reducedMotion = useReducedMotion();
  const gradient = useId().replace(/:/g, "");
  const [hidden, setHidden] = useState<Set<string>>(() => new Set());
  const [table, setTable] = useState(false);
  const [hover, setHover] = useState<number | null>(null);
  const tableId = useId();
  const effectiveState = state === "ready" && (!data.length || !series.some(v => data.some(row => typeof row[v.key] === "number" && Number.isFinite(row[v.key])))) ? "empty" : state;
  const singleBar = kind === "bar" && series.length === 1;
  const activeBar = hover ?? data.length - 1;
  const animation = { isAnimationActive: !reducedMotion, animationDuration: DURATION, animationEasing: "ease-out" as const };
  return <Card title={title} {...(description !== undefined ? { description } : {})} actions={actions}>
    <CardContentState state={effectiveState} onRetry={onRetry} loadingVariant="chart">
      <div className={s.chart}>
        <ResponsiveContainer width="100%" height="100%"><ComposedChart data={data} accessibilityLayer margin={{ top: 8, right: 0, bottom: 0, left: 0 }} onMouseMove={(event) => { const index = Number(event.activeTooltipIndex); setHover(Number.isInteger(index) ? index : null); }} onMouseLeave={() => setHover(null)}>
          <defs>{series.map(v => <linearGradient key={v.key} id={`${gradient}-${v.key}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={seriesColor(v)} stopOpacity={0.1} /><stop offset="1" stopColor={seriesColor(v)} stopOpacity={0} /></linearGradient>)}</defs>
          <CartesianGrid vertical={false} stroke="var(--grid)" strokeDasharray={DASH} />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={TICK} tickMargin={8} minTickGap={16} />
          <YAxis orientation="right" axisLine={false} tickLine={false} width={lightTheme["ui-chartAxisWidth"]} tickFormatter={formatValue} tick={TICK} />
          <Tooltip cursor={kind === "bar" ? { fill: "var(--acs)" } : { stroke: "var(--bd2)", strokeWidth: 1 }} wrapperStyle={{ outline: "none" }} content={(props: TooltipContentProps<ValueType, NameType>) => <ChartTooltip active={props.active} payload={props.payload} label={props.label} series={series} format={formatValue} />} />
          {series.map(v => kind === "bar"
            ? <Bar key={v.key} dataKey={v.key} name={v.label} fill={singleBar ? "var(--sf2)" : seriesColor(v)} radius={lightTheme["ui-chartBarRadius"]} hide={hidden.has(v.key)} {...(stacked ? { stackId: "total" } : {})} {...animation}>{singleBar && data.map((row, index) => <Cell key={`${row.label}-${index}`} fill={index === activeBar ? "var(--tx)" : "var(--sf2)"} />)}</Bar>
            : kind === "area"
              ? <Area key={v.key} dataKey={v.key} name={v.label} type="monotone" stroke={seriesColor(v)} {...(v.comparison || v.estimated ? { strokeDasharray: DASH } : {})} fill={`url(#${gradient}-${v.key})`} fillOpacity={1} strokeWidth={v.comparison ? 1.5 : lightTheme["ui-chartStroke"]} activeDot={{ r: 5, fill: "var(--sf)", stroke: seriesColor(v), strokeWidth: 2 }} hide={hidden.has(v.key)} connectNulls={false} {...animation} />
              : <Line key={v.key} dataKey={v.key} name={v.label} type="monotone" stroke={seriesColor(v)} {...(v.comparison || v.estimated ? { strokeDasharray: DASH } : {})} strokeWidth={v.comparison ? 1.5 : lightTheme["ui-chartStroke"]} strokeLinejoin="round" dot={false} activeDot={{ r: 5, fill: "var(--sf)", stroke: seriesColor(v), strokeWidth: 2 }} hide={hidden.has(v.key)} connectNulls={false} {...animation} />)}
        </ComposedChart></ResponsiveContainer>
      </div>
      <div className={s.footer}>
        <div className={s.legend} aria-label={`Séries de ${title}`}>{series.map(v => <button key={v.key} type="button" className={s.legendItem} aria-pressed={!hidden.has(v.key)} onClick={() => setHidden(previous => { const next = new Set(previous); if (next.has(v.key)) next.delete(v.key); else next.add(v.key); return next; })}><span className={s.swatch} data-kind={kind} data-comparison={v.comparison || v.estimated || undefined} style={{ "--swatch": singleBar ? "var(--tx)" : seriesColor(v) } as CSSProperties} aria-hidden="true" />{v.label}</button>)}</div>
        <Button size="sm" variant="ghost" aria-expanded={table} aria-controls={tableId} onClick={() => setTable(v => !v)}>{table ? "Ocultar dados" : "Ver dados"}</Button>
      </div>
      <div id={tableId} hidden={!table} className={s.tableScroll}><table className={s.table}><caption>{title}</caption><thead><tr><th scope="col">Período</th>{series.map(v => <th key={v.key} scope="col">{v.label}</th>)}</tr></thead><tbody>{data.map((row, index) => <tr key={`${row.label}-${index}`}><th scope="row">{row.label}</th>{series.map(v => <td key={v.key}>{display(row[v.key], formatValue)}</td>)}</tr>)}</tbody></table></div>
    </CardContentState>
  </Card>;
}

export interface DonutDatum { id: string; label: string; value: number; color: ChartColor }

const RADIUS = 40;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const SEGMENT_GAP = 3;

/**
 * Rosca (origem: Dados, "Donut / anel"): anel de 10 sobre trilho cavado, 3 de
 * vão entre as fatias; a fatia ativa engrossa para 14 e as outras recuam a
 * 35%. O centro mostra a fatia ativa (nome 11 tinta 3, porcentagem 300 26,
 * valor em mono 10); a legenda ao lado seleciona a fatia.
 */
export function DonutChart({ title, data, state = "ready", onRetry, formatValue = defaultFormat }: { title: string; data: DonutDatum[]; state?: CardState; onRetry?: () => void; formatValue?: (value: number) => string }) {
  const total = data.reduce((sum, item) => sum + Math.max(0, item.value), 0);
  const [active, setActive] = useState(0);
  const segments = useMemo(() => {
    let offset = 0;
    return data.map((item) => {
      const length = total > 0 ? CIRCUMFERENCE * Math.max(0, item.value) / total : 0;
      const segment = { item, dash: `${Math.max(0, length - SEGMENT_GAP)} ${CIRCUMFERENCE - length + SEGMENT_GAP}`, offset: -offset, length };
      offset += length;
      return segment;
    });
  }, [data, total]);
  const current = data[Math.min(active, data.length - 1)];
  const percent = (value: number) => total > 0 ? `${Math.round(value / total * 100)}%` : "0%";
  return <Card title={title}><CardContentState state={state === "ready" && !data.length ? "empty" : state} onRetry={onRetry} loadingVariant="donut">
    {total > 0 ? <div className={s.donutWrap}>
      <div className={s.donut}>
        <svg viewBox="0 0 100 100" role="img" aria-label={`${title}: ${data.map((item) => `${item.label} ${percent(item.value)}`).join(", ")}`}>
          <circle className={s.track} cx="50" cy="50" r={RADIUS} />
          {segments.map(({ item, dash, offset, length }, index) => length > 0 && <circle key={item.id} className={s.segment} cx="50" cy="50" r={RADIUS} stroke={pigment(item.color)} strokeDasharray={dash} strokeDashoffset={offset} data-active={index === active || undefined} data-dim={index !== active || undefined} onMouseEnter={() => setActive(index)} />)}
        </svg>
        {current && <div className={s.donutCenter} aria-hidden="true"><span className={s.centerName}>{current.label}</span><span className={s.centerPercent}>{percent(current.value)}</span><span className={s.centerValue}>{formatValue(current.value)}</span></div>}
      </div>
      <ul className={s.donutLegend} aria-label={title}>{data.map((item, index) => <li key={item.id}><button type="button" className={s.legendRow} data-dim={index !== active || undefined} aria-pressed={index === active} onMouseEnter={() => setActive(index)} onFocus={() => setActive(index)} onClick={() => setActive(index)}><span className={s.legendDot} style={{ "--swatch": pigment(item.color) } as CSSProperties} aria-hidden="true" /><span className={s.legendName}>{item.label}</span><span className={s.legendValue}>{formatValue(item.value)}</span><span className={s.legendPercent}>{percent(item.value)}</span></button></li>)}</ul>
    </div> : <><p className={s.zero}>Nenhuma ocorrência registrada</p>
      <ul className={s.donutLegend} aria-label={title}>{data.map((item) => <li key={item.id}><span className={s.legendRow}><span className={s.legendDot} style={{ "--swatch": pigment(item.color) } as CSSProperties} aria-hidden="true" /><span className={s.legendName}>{item.label}</span><span className={s.legendValue}>{formatValue(item.value)}</span></span></li>)}</ul></>}
  </CardContentState></Card>;
}
