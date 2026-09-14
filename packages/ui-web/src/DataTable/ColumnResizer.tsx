import { lightTheme } from "@spark/tokens/native-theme";
import { useRef, type KeyboardEvent, type PointerEvent } from "react";
import s from "./DataTable.module.css";

const MIN_WIDTH = Number.parseFloat(lightTheme["space-16"]);
const KEYBOARD_STEP = Number.parseFloat(lightTheme["space-4"]);

function columnWidth(handle: HTMLElement): number { return handle.closest("th")?.getBoundingClientRect().width ?? MIN_WIDTH; }

/** Alça de largura de coluna. Responde no pointer-down, não no release: a
 * largura acompanha o ponteiro enquanto ele se move (CLAUDE.md §7). O teclado
 * chega ao mesmo resultado pelas setas, e Home devolve a largura automática. */
export function ColumnResizer({ label, width, onResize, onReset }: { label: string; width: number | undefined; onResize: (width: number) => void; onReset: () => void }) {
  const drag = useRef<{ pointerX: number; width: number } | null>(null);
  function move(event: PointerEvent<HTMLSpanElement>) {
    if (!drag.current) return;
    onResize(Math.max(MIN_WIDTH, drag.current.width + event.clientX - drag.current.pointerX));
  }
  function keyDown(event: KeyboardEvent<HTMLSpanElement>) {
    const current = width ?? columnWidth(event.currentTarget);
    if (event.key === "ArrowRight") { event.preventDefault(); onResize(current + KEYBOARD_STEP); }
    if (event.key === "ArrowLeft") { event.preventDefault(); onResize(Math.max(MIN_WIDTH, current - KEYBOARD_STEP)); }
    if (event.key === "Home") { event.preventDefault(); onReset(); }
  }
  return <span
    role="separator"
    aria-orientation="vertical"
    aria-label={`Redimensionar coluna ${label}`}
    {...(width === undefined ? {} : { "aria-valuenow": Math.round(width), "aria-valuemin": MIN_WIDTH })}
    tabIndex={0}
    className={s.resizer}
    onPointerDown={event => { drag.current = { pointerX: event.clientX, width: columnWidth(event.currentTarget) }; event.currentTarget.setPointerCapture(event.pointerId); }}
    onPointerMove={move}
    onPointerUp={event => { drag.current = null; event.currentTarget.releasePointerCapture(event.pointerId); }}
    onLostPointerCapture={() => { drag.current = null; }}
    onDoubleClick={onReset}
    onKeyDown={keyDown}
  />;
}
