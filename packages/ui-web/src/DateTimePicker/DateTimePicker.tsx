import { useLayoutEffect, useRef, useState } from "react";
import { Popover as BasePopover } from "@base-ui/react/popover";
import { DayPicker } from "react-day-picker";
import { ptBR } from "react-day-picker/locale";
import { lightTheme } from "@spark/tokens/native-theme";
import { Button } from "../Button/Button.js";
import { Icon } from "../Icon/Icon.js";
import surface from "../shared/surfaces.module.css";
import s from "./DateTimePicker.module.css";

export type DateTimeMode = "date" | "time" | "datetime";
export interface DateTimePickerProps { label: string; value: string; onValueChange: (value: string) => void; mode?: DateTimeMode; disabled?: boolean; placeholder?: string }

const pad = (n: number) => String(n).padStart(2, "0");
function readDate(text: string): Date | undefined { if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return undefined; const [y = 0, m = 0, d = 0] = text.split("-").map(Number); const result = new Date(y, m - 1, d); return result.getFullYear() === y && result.getMonth() === m - 1 && result.getDate() === d ? result : undefined; }
function dateText(date: Date) { return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`; }
const DEFAULT_TIME = "09:00";
function readTime(text: string): string | undefined { const match = /(?:^|[T ])([01]\d|2[0-3]):([0-5]\d)/.exec(text); return match ? `${match[1]}:${match[2]}` : undefined; }
function timestampDate(text: string): Date | undefined {
  const normalized = text.trim().replace(/^(\d{4}-\d{2}-\d{2}) /, "$1T").replace(/([+-]\d{2})(\d{2})$/, "$1:$2").replace(/([+-]\d{2})$/, "$1:00");
  const parsed = new Date(normalized); return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}
function readValue(value: string, mode: DateTimeMode): { date: Date | undefined; time: string } {
  if (mode === "date") return { date: readDate(value.slice(0, 10)), time: DEFAULT_TIME };
  if (mode === "time") return { date: undefined, time: readTime(value) ?? DEFAULT_TIME };
  const hasZone = /(?:Z|[+-]\d{2}(?::?\d{2})?)$/i.test(value.trim());
  if (hasZone) { const instant = timestampDate(value); if (instant) return { date: new Date(instant.getFullYear(), instant.getMonth(), instant.getDate()), time: `${pad(instant.getHours())}:${pad(instant.getMinutes())}` }; }
  return { date: readDate(value.slice(0, 10)), time: readTime(value) ?? DEFAULT_TIME };
}

/** Lista com o valor atual incluído quando ele não cai no passo (11:37 num passo de 30). */
function withCurrent(options: readonly string[], current: string): string[] {
  return options.includes(current) ? [...options] : [...options, current].sort();
}
const HALF_HOURS = Array.from({ length: 48 }, (_, index) => `${pad(Math.floor(index / 2))}:${index % 2 ? "30" : "00"}`);
const HOURS = Array.from({ length: 24 }, (_, index) => pad(index));
const MINUTES = Array.from({ length: 12 }, (_, index) => pad(index * 5));

/* Campo vazio mostra o FORMATO: quem bate o olho reconhece que ali vai uma data. */
const EMPTY_HINT: Record<DateTimeMode, string> = { date: "dd/mm/aaaa", time: "hh:mm", datetime: "dd/mm/aaaa · hh:mm" };

/**
 * Seletores de data, data e hora, e hora (origem: Seleção §12–§14). O gatilho
 * é o gatilho de escolha compartilhado (o mesmo do Select), com o ícone e o
 * valor em mono. A folha é sólida — papel segurado (--sf3 + granulação, --e2),
 * raio 32 —, abre descendo 6px e fecha em 240 ms. Dia em pílula de 32, mono
 * 12; hoje com anel de 1px; escolhido em carvão. Data fecha ao escolher; data
 * e hora confirma; hora tem colunas de hora e minuto (passo 5) e «Agora».
 */
export function DateTimePicker({ label, value, onValueChange, mode = "date", disabled = false, placeholder }: DateTimePickerProps) {
  const hint = placeholder ?? EMPTY_HINT[mode];
  const initial = readValue(value, mode);
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date | undefined>(initial.date);
  const [month, setMonth] = useState<Date | undefined>(initial.date);
  const [time, setTime] = useState(initial.time);
  const sheet = useRef<HTMLDivElement>(null);
  function changeOpen(next: boolean) {
    if (next) { const current = readValue(value, mode); setDate(current.date); setMonth(current.date ?? new Date()); setTime(current.time); }
    setOpen(next);
  }
  function commit(nextDate: Date | undefined, nextTime: string) {
    onValueChange(mode === "time" ? nextTime : nextDate ? `${dateText(nextDate)}${mode === "datetime" ? `T${nextTime}` : ""}` : "");
    setOpen(false);
  }
  const current = readValue(value, mode);
  const display = mode === "time" ? (value ? current.time : "") : current.date ? `${current.date.toLocaleDateString("pt-BR")}${mode === "datetime" ? ` · ${current.time}` : ""}` : "";
  const [hour = "09", minute = "00"] = time.split(":");

  /* A coluna de horas abre já mostrando o horário escolhido, sem rolar a página. */
  useLayoutEffect(() => {
    if (!open) return;
    for (const list of sheet.current?.querySelectorAll<HTMLElement>("[data-time-list]") ?? []) {
      const chosen = list.querySelector<HTMLElement>('[aria-pressed="true"]');
      if (chosen) list.scrollTop = chosen.offsetTop - list.clientHeight / 2 + chosen.offsetHeight / 2;
    }
  }, [open]);

  const calendar = mode !== "time" && <DayPicker
    mode="single"
    locale={ptBR}
    selected={date}
    onSelect={(next) => { setDate(next); if (mode === "date" && next) commit(next, time); }}
    {...(month ? { month, onMonthChange: setMonth } : {})}
    autoFocus
    showOutsideDays
    classNames={{ root: s.calendar ?? "", months: s.months ?? "", month: s.month ?? "", month_caption: s.caption ?? "", caption_label: s.captionLabel ?? "", nav: s.nav ?? "", button_previous: s.navButton ?? "", button_next: s.navButton ?? "", chevron: s.chevron ?? "", month_grid: s.grid ?? "", weekday: s.weekday ?? "", day: s.day ?? "", day_button: s.dayButton ?? "", selected: s.selected ?? "", today: s.today ?? "", outside: s.outside ?? "", disabled: s.disabled ?? "" }}
  />;

  const timeList = (name: string, options: readonly string[], chosen: string, choose: (option: string) => void) => <div className={s.timeList} role="group" aria-label={name} data-time-list="">
    {withCurrent(options, chosen).map((option) => <button key={option} type="button" className={s.timeOption} aria-pressed={option === chosen} onClick={() => choose(option)}>{option}</button>)}
  </div>;

  return <BasePopover.Root open={open} onOpenChange={changeOpen}>
    <BasePopover.Trigger disabled={disabled} className={`${surface.trigger} ${s.trigger}`} data-empty={!display || undefined} aria-label={`${label}: ${display || hint}`}>
      <span className={s.triggerIcon} data-picker-icon="" aria-hidden="true"><Icon name={mode === "time" ? "clock" : "calendar"} /></span>
      <span className={`${surface.selectValue} ${s.value}`}>{display || hint}</span>
      <span className={surface.triggerIcon} aria-hidden="true"><Icon name="chevron" /></span>
    </BasePopover.Trigger>
    <BasePopover.Portal>
      <BasePopover.Positioner sideOffset={Number.parseFloat(lightTheme["pop-gap"])} align="start" className={surface.positioner}>
        <BasePopover.Popup ref={sheet} className={`${surface.popup} ${s.sheet}`} data-mode={mode} data-inline-editor="" aria-label={label}>
          {mode === "date" && calendar}
          {mode === "datetime" && <div className={s.split}>{calendar}{timeList("Horários", HALF_HOURS, time, setTime)}</div>}
          {mode === "time" && <div className={s.columns}>
            <div className={s.column}><span className={s.columnTitle}>Hora</span>{timeList("Horas", HOURS, hour, (next) => setTime(`${next}:${minute}`))}</div>
            <div className={s.column}><span className={s.columnTitle}>Minuto</span>{timeList("Minutos", MINUTES, minute, (next) => setTime(`${hour}:${next}`))}</div>
          </div>}
          {(mode !== "date" || value) && <div className={s.footer}>
            {mode === "time"
              ? <Button size="sm" variant="ghost" onClick={() => { const now = new Date(); commit(undefined, `${pad(now.getHours())}:${pad(Math.floor(now.getMinutes() / 5) * 5)}`); }}>Agora</Button>
              : value ? <Button size="sm" variant="ghost" onClick={() => { onValueChange(""); setOpen(false); }}>Limpar</Button> : <span />}
            {mode !== "date" && <Button size="sm" disabled={mode === "datetime" && !date} onClick={() => commit(date, time)}>{mode === "time" ? "OK" : "Confirmar"}</Button>}
          </div>}
        </BasePopover.Popup>
      </BasePopover.Positioner>
    </BasePopover.Portal>
  </BasePopover.Root>;
}
export function DatePicker(props: Omit<DateTimePickerProps, "mode">) { return <DateTimePicker {...props} mode="date" />; }
export function TimePicker(props: Omit<DateTimePickerProps, "mode">) { return <DateTimePicker {...props} mode="time" />; }
