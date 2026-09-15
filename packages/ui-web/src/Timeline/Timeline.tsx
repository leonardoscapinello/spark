import { useEffect, useRef, useState, type ReactNode } from "react";
import { UserAvatar } from "../UserAvatar/UserAvatar.js";
import { Tooltip } from "../Tooltip/Tooltip.js";
import styles from "./Timeline.module.css";

export interface TimelineActor {
  name: string;
  email?: string;
  avatarUrl?: string | null;
}

export interface TimelineChange {
  label: string;
  before: string;
  after: string;
}

export interface TimelineItem {
  id: string;
  title: string;
  description?: ReactNode;
  timestamp: string;
  tone?: "neutral" | "positive" | "negative" | "accent";
  actor?: TimelineActor;
  changes?: readonly TimelineChange[];
}

export function Timeline({ items, emptyText = "Nenhum evento registrado.", initialCount, pageSize = 25 }: { items: readonly TimelineItem[]; emptyText?: string; initialCount?: number; pageSize?: number }) {
  const [visibleCount, setVisibleCount] = useState(initialCount ?? items.length);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => setVisibleCount(initialCount ?? items.length), [initialCount, items.length]);
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || visibleCount >= items.length) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) setVisibleCount((count) => Math.min(items.length, count + pageSize));
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [items.length, pageSize, visibleCount]);
  if (!items.length) return <div className={styles.empty}>{emptyText}</div>;
  const visibleItems = items.slice(0, visibleCount);
  return <><ol className={styles.root}>{visibleItems.map((item) => <li key={item.id} className={styles.item} data-tone={item.tone ?? "neutral"}>
    <span className={styles.marker} aria-hidden="true" />
    <div className={styles.content}>
      <div className={styles.heading}><strong>{item.title}</strong>{item.actor && <Actor actor={item.actor} />}</div>
      {item.description && <div className={styles.description}>{item.description}</div>}
      {item.changes && item.changes.length > 0 && <dl className={styles.changes}>{item.changes.map((change, index) => <div key={`${change.label}:${index}`}>
        <dt>{change.label}</dt><dd><span>{change.before}</span><span aria-hidden="true">→</span><strong>{change.after}</strong></dd>
      </div>)}</dl>}
      <time dateTime={item.timestamp}>{formatTimestamp(item.timestamp)}</time>
    </div>
  </li>)}</ol>{visibleCount < items.length && <div ref={sentinelRef} className={styles.sentinel} aria-label="Carregando mais eventos" />}</>;
}

function Actor({ actor }: { actor: TimelineActor }) {
  const user = { name: actor.name, avatarUrl: actor.avatarUrl ?? null };
  return <Tooltip appearance="surface" side="top" content={<div className={styles.profile}><UserAvatar user={user} size="small" /><span><strong>{actor.name}</strong>{actor.email && <small>{actor.email}</small>}</span></div>}>
    <button type="button" className={styles.actor} aria-label={`Ver perfil de ${actor.name}`}><UserAvatar user={user} size="small" /><span>{actor.name}</span></button>
  </Tooltip>;
}

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
