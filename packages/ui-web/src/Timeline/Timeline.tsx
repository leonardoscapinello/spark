import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
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
  entries?: readonly TimelineItem[];
}

export function Timeline({ items, emptyText = "Nenhum evento registrado.", initialCount, pageSize = 25, density = "default", groupByDay = false }: { items: readonly TimelineItem[]; emptyText?: string; initialCount?: number; pageSize?: number; density?: "default" | "compact"; groupByDay?: boolean }) {
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
  return <><ol className={styles.root} data-density={density}>{visibleItems.map((item, index) => {
    const previousItem = visibleItems[index - 1];
    const startsDay = groupByDay && (!previousItem || dayKey(previousItem.timestamp) !== dayKey(item.timestamp));
    return <Fragment key={item.id}>
      {startsDay && <li className={styles.dayBreak} role="presentation"><time dateTime={item.timestamp}>{formatDay(item.timestamp)}</time></li>}
      <li className={styles.item} data-tone={item.tone ?? "neutral"}>
        <span className={styles.marker} aria-hidden="true" />
        <div className={styles.content}>
          <div className={styles.heading}><strong>{item.title}</strong><span className={styles.metadata}><time dateTime={item.timestamp} title={formatTimestamp(item.timestamp)}>{groupByDay ? new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(item.timestamp)) : formatTimestamp(item.timestamp)}</time>{item.actor && <Actor actor={item.actor} />}</span></div>
          {item.description && <div className={styles.description}>{item.description}</div>}
          {item.entries && <details className={styles.group}>
            <summary>{item.entries.length} alterações próximas · ver detalhes</summary>
            {item.entries.map((entry) => <div className={styles.groupEntry} key={entry.id}>
              <time dateTime={entry.timestamp} title={formatTimestamp(entry.timestamp)}>{new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(entry.timestamp))}</time>
              {entry.changes?.map((change, i) => <div key={i}><span>{change.label}: </span>{change.before} → <strong>{change.after}</strong></div>)}
            </div>)}
          </details>}

          {item.changes && item.changes.length > 0 && <dl className={styles.changes}>{item.changes.map((change, changeIndex) => <div key={`${change.label}:${changeIndex}`}>
            <dt>{change.label}</dt><dd><span>{change.before}</span><span aria-hidden="true">→</span><strong>{change.after}</strong></dd>
          </div>)}</dl>}
        </div>
      </li>
    </Fragment>;
  })}</ol>{visibleCount < items.length && <div ref={sentinelRef} className={styles.sentinel} aria-label="Carregando mais eventos" />}</>;
}

function Actor({ actor }: { actor: TimelineActor }) {
  const user = { name: actor.name, avatarUrl: actor.avatarUrl ?? null };
  return <Tooltip appearance="surface" side="top" content={<div className={styles.profile}><UserAvatar user={user} size="small" /><span><strong>{actor.name}</strong>{actor.email && <small>{actor.email}</small>}</span></div>}>
    <button type="button" className={styles.actor} aria-label={`Ver perfil de ${actor.name}`}><UserAvatar user={user} size="small" /><span>{actor.name}</span></button>
  </Tooltip>;
}

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "medium" }).format(new Date(value));
}

function dayKey(value: string): string {
  const date = new Date(value);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function formatDay(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }).format(new Date(value));
}
