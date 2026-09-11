import type { ReactNode } from "react";
import styles from "./Timeline.module.css";

export interface TimelineItem {
  id: string;
  title: string;
  description?: ReactNode;
  timestamp: string;
  tone?: "neutral" | "positive" | "negative" | "accent";
}

export function Timeline({ items, emptyText = "Nenhum evento registrado." }: { items: readonly TimelineItem[]; emptyText?: string }) {
  if (!items.length) return <div className={styles.empty}>{emptyText}</div>;
  return <ol className={styles.root}>{items.map((item) => <li key={item.id} className={styles.item} data-tone={item.tone ?? "neutral"}>
    <span className={styles.marker} aria-hidden="true" />
    <div className={styles.content}><strong>{item.title}</strong>{item.description && <div className={styles.description}>{item.description}</div>}<time dateTime={item.timestamp}>{formatTimestamp(item.timestamp)}</time></div>
  </li>)}</ol>;
}

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
