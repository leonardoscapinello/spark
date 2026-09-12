import { useId, type ReactNode } from "react";
import { Button } from "../Button/Button.js";
import { Skeleton } from "../Feedback/Feedback.js";
import s from "./Card.module.css";
export interface CardProps { title: string; description?: string; actions?: ReactNode; footer?: ReactNode; children?: ReactNode; appearance?: "outlined" | "elevated" }
export function Card({ title, description, actions, footer, children, appearance = "outlined" }: CardProps) {
  const id = useId();
  return <section aria-labelledby={id} className={s.card} data-appearance={appearance}><header className={s.header}><div><h2 id={id}>{title}</h2>{description && <p>{description}</p>}</div>{actions && <div className={s.actions}>{actions}</div>}</header>{children !== undefined && <div className={s.body}>{children}</div>}{footer && <footer className={s.footer}>{footer}</footer>}</section>;
}
export type CardState = "ready" | "loading" | "empty" | "error";
export function CardContentState({ state, children, emptyText = "Nenhum dado neste período", errorText = "Não foi possível carregar os dados", onRetry, loadingVariant = "metric" }: { state: CardState; children: ReactNode; emptyText?: string; errorText?: string; onRetry?: (() => void) | undefined; loadingVariant?: "metric" | "chart" | "donut" }) {
  if(state === "loading") return <div role="status" aria-label="Carregando dados" className={s.loading} data-variant={loadingVariant}>{loadingVariant === "chart" ? <div className={s.chartBars}>{[0,1,2,3,4,5,6].map(index=><Skeleton key={index} />)}</div> : loadingVariant === "donut" ? <Skeleton className={s.donutPlaceholder} /> : <><Skeleton className={s.valuePlaceholder} /><Skeleton className={s.comparisonPlaceholder} /></>}</div>;
  if(state === "error") return <div role="alert" className={s.state}><p>{errorText}</p>{onRetry && <Button variant="secondary" onClick={onRetry}>Tentar novamente</Button>}</div>;
  if(state === "empty") return <div className={s.state}><p>{emptyText}</p></div>;
  return children;
}
export interface MetricCardProps extends Pick<CardProps,"title"|"description"|"actions"> { value: ReactNode; comparison?: string; sentiment?: "neutral" | "positive" | "negative"; state?: CardState; onRetry?: () => void }
export function MetricCard({ title, description, actions, value, comparison, sentiment = "neutral", state = "ready", onRetry }: MetricCardProps) {
  return <Card title={title} {...(description !== undefined ? {description} : {})} actions={actions}><CardContentState state={state} onRetry={onRetry}><div className={s.value}>{value}</div>{comparison && <p className={s.comparison} data-sentiment={sentiment}>{comparison}</p>}</CardContentState></Card>;
}
export function ProgressCard({ title, value, max = 100, label, footer }: { title: string; value: number; max?: number; label: string; footer?: ReactNode }) {
  return <Card title={title} footer={footer}><div className={s.progressLabel}>{label}</div><progress aria-label={title} className={s.progress} value={value} max={max} /></Card>;
}
export interface SummaryItem { id: string; label: string; value: ReactNode; detail?: string; action?: ReactNode }
export function SummaryList({ items, label }: { items: readonly SummaryItem[]; label: string }) {
  return <ul className={s.list} aria-label={label}>{items.map(item=><li key={item.id}><div><span>{item.label}</span>{item.detail && <small>{item.detail}</small>}</div><strong>{item.value}</strong>{item.action}</li>)}</ul>;
}
