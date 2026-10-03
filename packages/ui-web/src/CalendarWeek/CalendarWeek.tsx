import { useId, type ReactNode } from "react";
import { Button } from "../Button/Button.js";
import { Icon } from "../Icon/Icon.js";
import { Surface } from "../Surface/Surface.js";
import styles from "./CalendarWeek.module.css";

export interface CalendarWeekItem {
  id: string;
  date: string;
  hour: number;
  content: ReactNode;
}

export interface CalendarWeekProps {
  label: string;
  week: Date;
  items: readonly CalendarWeekItem[];
  onWeekChange: (week: Date) => void;
}

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function mondayOf(date: Date): Date {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  monday.setDate(monday.getDate() - (monday.getDay() + 6) % 7);
  return monday;
}

/**
 * Agenda da semana (origem: Perfil §7): folha pousada, intervalo 15/500, setas
 * de tinta, cabeçalho do dia com número em mono numa pílula de 28 (hoje com
 * anel de 1px), horas em mono e compromissos em folhas pequenas.
 */
export function CalendarWeek({ label, week, items, onWeekChange }: CalendarWeekProps) {
  const titleId = useId();
  const monday = mondayOf(week);
  const days = Array.from({ length: 7 }, (_, index) => new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + index));
  const dayKeys = new Set(days.map(dateKey));
  const visible = items.filter((item) => dayKeys.has(item.date) && item.hour >= 0 && item.hour < 24);
  const firstHour = Math.min(7, ...visible.map((item) => item.hour));
  const lastHour = Math.max(19, ...visible.map((item) => item.hour));
  const hours = Array.from({ length: lastHour - firstHour + 1 }, (_, index) => firstHour + index);
  const itemsBySlot = new Map<string, CalendarWeekItem[]>();
  for (const item of visible) {
    const slot = `${item.date}:${item.hour}`;
    const slotItems = itemsBySlot.get(slot) ?? [];
    slotItems.push(item);
    itemsBySlot.set(slot, slotItems);
  }
  const todayKey = dateKey(new Date());
  const rangeFormatter = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" });

  return <Surface as="section" className={styles.root ?? ""} aria-labelledby={titleId}>
    <header className={styles.header}>
      <div className={styles.heading}><h2 id={titleId}>{rangeFormatter.format(days[0])} – {rangeFormatter.format(days[6])}</h2><span>{visible.length} {visible.length === 1 ? "atividade nesta semana" : "atividades nesta semana"}</span></div>
      <div className={styles.controls} role="group" aria-label={`Navegar na agenda de ${label}`}>
        <Button size="sm" variant="secondary" onClick={() => onWeekChange(new Date())}>Hoje</Button>
        <Button size="sm" variant="ghost" iconOnly icon={<Icon name="chevronLeft" />} aria-label="Semana anterior" onClick={() => onWeekChange(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() - 7))} />
        <Button size="sm" variant="ghost" iconOnly icon={<Icon name="chevronRight" />} aria-label="Próxima semana" onClick={() => onWeekChange(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 7))} />
      </div>
    </header>
    <div className={styles.scroll} role="region" aria-label={`Agenda semanal de ${label}`} tabIndex={0}>
      <div className={styles.grid}>
        <div className={styles.corner} aria-hidden="true" />
        {days.map((day) => <div key={dateKey(day)} className={styles.dayHeading} data-today={dateKey(day) === todayKey || undefined}><span>{new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(day)}</span><strong>{day.getDate()}</strong></div>)}
        {hours.map((hour) => <div className={styles.hourRow} key={hour}>
          <div className={styles.hourLabel}>{String(hour).padStart(2, "0")}:00</div>
          {days.map((day) => <div key={dateKey(day)} className={styles.slot} data-today={dateKey(day) === todayKey || undefined} aria-label={`${new Intl.DateTimeFormat("pt-BR", { dateStyle: "full" }).format(day)}, ${String(hour).padStart(2, "0")}:00`}>
            {(itemsBySlot.get(`${dateKey(day)}:${hour}`) ?? []).map((item) => <div key={item.id} className={styles.item}>{item.content}</div>)}
          </div>)}
        </div>)}
      </div>
    </div>
  </Surface>;
}
