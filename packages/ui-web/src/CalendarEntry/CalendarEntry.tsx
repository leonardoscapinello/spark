import type { ReactNode } from "react";
import s from "./CalendarEntry.module.css";

export interface CalendarEntryProps {
  /** Hora ou intervalo, em mono. */
  time?: ReactNode;
  title: ReactNode;
  /** Pessoa, calendário de origem, tipo. Tinta 3. */
  detail?: ReactNode;
  /** Um Signal ou Badge curto (atrasada, concluída). */
  status?: ReactNode;
  done?: boolean;
}

/**
 * O compromisso dentro da célula do calendário (semana ou mês): hora em mono
 * 10,5, título 12/500 em uma linha, apoio 11 em tinta 3 e o estado como sinal.
 * A folha da célula vem do calendário; aqui é só o conteúdo.
 */
export function CalendarEntry({ time, title, detail, status, done = false }: CalendarEntryProps) {
  return <span className={s.root} data-done={done || undefined}>
    {time !== undefined && time !== null && <span className={s.time}>{time}</span>}
    <span className={s.title}>{title}</span>
    {detail !== undefined && detail !== null && <span className={s.detail}>{detail}</span>}
    {status}
  </span>;
}
