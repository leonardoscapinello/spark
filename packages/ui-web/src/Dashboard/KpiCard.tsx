import { cloneElement, type ReactElement, type ReactNode } from "react";
import { Button } from "../Button/Button.js";
import { AnimatedValue } from "../Card/AnimatedValue.js";
import { Skeleton } from "../Feedback/Feedback.js";
import { Icon } from "../Icon/Icon.js";
import s from "./KpiCard.module.css";

export interface KpiDelta {
  label: string;
  /** A cor segue o que é bom ou ruim, não o sinal: CAC caindo é positivo. */
  tone: "positive" | "negative" | "neutral";
  direction?: "up" | "down";
}

export interface KpiCardProps {
  label: string;
  value: string | number;
  delta?: KpiDelta;
  /** Uma frase de apoio, 11 em tinta 3. */
  hint?: ReactNode;
  /** Série curta do período para a linha fina (sparkline). */
  trend?: readonly number[];
  state?: "ready" | "loading" | "error";
  onRetry?: () => void;
  /** Cartão clicável: o elemento (ex.: <Link to="/deals" />) vira o próprio cartão e ganha o hover que ergue. */
  render?: ReactElement;
}

/**
 * KPI da identidade (origem: Dados, "KPI"): folha pousada de raio 40, padding
 * 22 24. Rótulo 12 em tinta 2 com a variação em pílula de 22; o número é leve
 * (300, 32, −0,04em) e rola como odômetro quando muda. Só ergue no hover
 * quando é clicável.
 */
export function KpiCard({ label, value, delta, hint, trend, state = "ready", onRetry, render }: KpiCardProps) {
  const content = <>
    <span className={s.head}>
      <span className={s.label}>{label}</span>
      {delta && state === "ready" && <span className={s.delta} data-tone={delta.tone}>{delta.direction && <span className={s.deltaIcon} aria-hidden="true"><Icon name={delta.direction === "up" ? "arrowUpRight" : "arrowDown"} /></span>}{delta.label}</span>}
    </span>
    {state === "loading"
      ? <span className={s.loading} role="status" aria-label={`Carregando ${label}`}><Skeleton className={s.valueSkeleton} /></span>
      : state === "error"
        ? <span className={s.error} role="alert">Indisponível agora{onRetry && !render && <Button size="sm" variant="ghost" onClick={onRetry}>Tentar de novo</Button>}</span>
        : <span className={s.value}><AnimatedValue value={value} /></span>}
    {hint && state === "ready" && <span className={s.hint}>{hint}</span>}
    {trend && trend.length > 1 && state === "ready" && <svg className={s.spark} viewBox="0 0 120 36" preserveAspectRatio="none" aria-hidden="true"><path d={sparkPath(trend)} /></svg>}
  </>;
  if (render) {
    const element = render as ReactElement<{ className?: string; children?: ReactNode; "data-interactive"?: string }>;
    return cloneElement(element, { className: [s.root, element.props.className].filter(Boolean).join(" "), "data-interactive": "", children: content });
  }
  return <article className={s.root} aria-label={label}>{content}</article>;
}

/** Pontos com folga de 14% em cima e 6% embaixo, suavizados (Catmull-Rom → cúbica, fator 1/6). */
function sparkPath(values: readonly number[], width = 120, height = 36): string {
  const min = Math.min(...values);
  const span = Math.max(...values) - min || 1;
  const points = values.map((value, index) => [index / (values.length - 1) * width, height * 0.14 + (1 - (value - min) / span) * height * 0.8] as const);
  const [first] = points;
  if (!first) return "";
  let path = `M${first[0]},${first[1]}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const p1 = points[index]!;
    const p2 = points[index + 1]!;
    const p0 = points[index - 1] ?? p1;
    const p3 = points[index + 2] ?? p2;
    path += ` C${p1[0] + (p2[0] - p0[0]) / 6},${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6},${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]},${p2[1]}`;
  }
  return path;
}
