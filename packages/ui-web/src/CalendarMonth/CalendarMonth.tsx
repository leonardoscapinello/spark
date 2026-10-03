import { useId, type ReactNode } from "react";
import { Button } from "../Button/Button.js";
import { Icon } from "../Icon/Icon.js";
import { Surface } from "../Surface/Surface.js";
import styles from "./CalendarMonth.module.css";

export interface CalendarMonthItem {
  id: string;
  date: string;
  content: ReactNode;
}

export interface CalendarMonthProps {
  label: string;
  month: Date;
  items: readonly CalendarMonthItem[];
  onMonthChange: (month: Date) => void;
}

const weekdays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

/**
 * Calendário do mês (origem: Perfil §7): folha pousada, mês 15/500, setas de
 * tinta de 28, dias da semana 10,5 em tinta 3, número do dia em mono numa
 * pílula de 28 — hoje com anel de 1px em tinta 3. Cada compromisso é uma
 * folha pequena com o conteúdo do `CalendarEntry`.
 */
export function CalendarMonth({ label, month, items, onMonthChange }: CalendarMonthProps) {
  const titleId = useId();
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstWeekday = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cellCount = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;
  const today = new Date();
  const todayKey = dateKey(today);
  const itemsByDay = new Map<string, CalendarMonthItem[]>();
  for (const item of items) {
    const dayItems = itemsByDay.get(item.date) ?? [];
    dayItems.push(item);
    itemsByDay.set(item.date, dayItems);
  }
  const visibleCount = Array.from(itemsByDay).reduce((count, [key, dayItems]) => key.startsWith(`${year}-${String(monthIndex + 1).padStart(2, "0")}-`) ? count + dayItems.length : count, 0);

  return <Surface as="section" className={styles.root ?? ""} aria-labelledby={titleId}>
    <header className={styles.header}>
      <div className={styles.heading}><h2 id={titleId}>{new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(month)}</h2><span>{visibleCount} {visibleCount === 1 ? "item neste mês" : "itens neste mês"}</span></div>
      <div className={styles.controls} role="group" aria-label={`Navegar no calendário de ${label}`}>
        <Button size="sm" variant="secondary" onClick={() => onMonthChange(new Date(today.getFullYear(), today.getMonth(), 1))}>Hoje</Button>
        <Button size="sm" variant="ghost" iconOnly icon={<Icon name="chevronLeft" />} aria-label="Mês anterior" onClick={() => onMonthChange(new Date(year, monthIndex - 1, 1))} />
        <Button size="sm" variant="ghost" iconOnly icon={<Icon name="chevronRight" />} aria-label="Próximo mês" onClick={() => onMonthChange(new Date(year, monthIndex + 1, 1))} />
      </div>
    </header>
    <div className={styles.scroll} role="region" aria-label={`Calendário mensal de ${label}`} tabIndex={0}>
      <div className={styles.grid}>
        {weekdays.map((weekday) => <div key={weekday} className={styles.weekday}>{weekday}</div>)}
        {Array.from({ length: cellCount }, (_, index) => {
          const day = index - firstWeekday + 1;
          const inMonth = day > 0 && day <= daysInMonth;
          const date = new Date(year, monthIndex, day);
          const key = dateKey(date);
          return <div key={key} className={styles.day} data-outside={!inMonth || undefined} data-today={key === todayKey || undefined} aria-label={new Intl.DateTimeFormat("pt-BR", { dateStyle: "full" }).format(date)}>
            <span className={styles.dayNumber}>{date.getDate()}</span>
            {inMonth && <div className={styles.items}>{(itemsByDay.get(key) ?? []).map((item) => <div key={item.id} className={styles.item}>{item.content}</div>)}</div>}
          </div>;
        })}
      </div>
    </div>
  </Surface>;
}

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
