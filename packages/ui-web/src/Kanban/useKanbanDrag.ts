import { useCallback, useEffect, useLayoutEffect, useRef, useState, type DragEvent as ReactDragEvent } from "react";
import { fadeAway, ghostTransform, landFrom } from "../motion/land.js";

export interface KanbanDragState {
  /** Cartão na mão. */
  id: string;
  /** Coluna de onde saiu. */
  from: string;
  width: number;
  height: number;
  /** Onde o ponteiro pegou o cartão, a partir do canto. */
  offsetX: number;
  offsetY: number;
  /** "drag": na mão · "land": solto, esperando o cartão aparecer no destino. */
  phase: "drag" | "land";
  /** Coluna onde vai pousar (null: o cartão sai do quadro). */
  target: string | null;
}

/** Imagem de arrasto vazia: quem desenha o fantasma é o quadro, não o navegador. */
let blank: HTMLImageElement | null = null;
function blankImage(): HTMLImageElement {
  blank ??= Object.assign(new Image(), { src: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" });
  return blank;
}

/** Quanto o fantasma espera o cartão aparecer no destino antes de sumir. */
const LANDING_WAIT_MS = 1_500;

/**
 * Arrasto do kanban (origem: Perfil §15) sobre o arrastar-e-soltar nativo,
 * que continua dono dos alvos (colunas e zonas de ação). O navegador não
 * desenha nada: o fantasma segue o ponteiro inclinado e erguido, o cartão
 * original sai da coluna e, ao soltar, o cartão real pousa vindo de onde o
 * fantasma estava (landFrom).
 */
export function useKanbanDrag() {
  const [drag, setDrag] = useState<KanbanDragState | null>(null);
  const current = useRef<KanbanDragState | null>(null);
  const ghostRef = useRef<HTMLDivElement | null>(null);
  const pointer = useRef({ x: 0, y: 0 });
  const frame = useRef(0);
  const wait = useRef<ReturnType<typeof setTimeout> | null>(null);
  const starting = useRef(0);

  const commit = useCallback((next: KanbanDragState | null) => { current.current = next; setDrag(next); }, []);
  const origin = useCallback((state: KanbanDragState) => ({ left: pointer.current.x - state.offsetX, top: pointer.current.y - state.offsetY }), []);

  useEffect(() => { blankImage(); return () => { if (wait.current) clearTimeout(wait.current); }; }, []);

  /* O fantasma segue o ponteiro. `dragover` do documento traz coordenadas em
   * todos os navegadores (o `drag` da origem chega zerado no Firefox). */
  useEffect(() => {
    if (drag?.phase !== "drag") return;
    const follow = (event: DragEvent) => {
      if (event.clientX === 0 && event.clientY === 0) return;
      pointer.current = { x: event.clientX, y: event.clientY };
      if (frame.current) return;
      frame.current = requestAnimationFrame(() => {
        frame.current = 0;
        const state = current.current;
        if (state && ghostRef.current) { const at = origin(state); ghostRef.current.style.transform = ghostTransform(at.left, at.top); }
      });
    };
    document.addEventListener("dragover", follow);
    return () => { document.removeEventListener("dragover", follow); if (frame.current) cancelAnimationFrame(frame.current); frame.current = 0; };
  }, [drag?.phase, origin]);

  /* Pouso: assim que o cartão aparece no destino, ele parte do fantasma. */
  useLayoutEffect(() => {
    if (!drag || drag.phase !== "land" || drag.target === null) return;
    const card = document.querySelector<HTMLElement>(`[data-kcol="${CSS.escape(drag.target)}"] [data-kcard="${CSS.escape(drag.id)}"]`);
    if (!card || card.hidden) return;
    if (wait.current) { clearTimeout(wait.current); wait.current = null; }
    landFrom(card, origin(drag));
    commit(null);
  });

  /** dragstart do cartão: prende o ponteiro e esconde a origem no quadro seguinte. */
  const start = useCallback((event: ReactDragEvent<HTMLElement>, id: string, from: string) => {
    const rect = event.currentTarget.getBoundingClientRect();
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", id);
    event.dataTransfer.setDragImage(blankImage(), 0, 0);
    pointer.current = { x: event.clientX, y: event.clientY };
    const next: KanbanDragState = { id, from, width: rect.width, height: rect.height, offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top, phase: "drag", target: null };
    // Mexer na origem no mesmo tique do dragstart aborta o arrasto no Chrome.
    starting.current = requestAnimationFrame(() => { starting.current = 0; commit(next); });
  }, [commit]);

  /** Some com o fantasma (destino que não mostra o cartão, como arquivados).
   * Só o pouso que ainda está esperando: um arrasto novo não é apagado. */
  const vanish = useCallback((id: string) => {
    const waiting = () => current.current?.id === id && current.current.phase === "land";
    if (!waiting()) return;
    const ghost = ghostRef.current;
    if (!ghost) { commit(null); return; }
    void fadeAway(ghost).then(() => { if (waiting()) commit(null); });
  }, [commit]);

  /** Soltou: o fantasma espera o cartão aparecer em `target` e o pousa lá. */
  const land = useCallback((target: string | null) => {
    const state = current.current;
    if (!state) return;
    commit({ ...state, phase: "land", target });
    if (wait.current) clearTimeout(wait.current);
    wait.current = setTimeout(() => vanish(state.id), target === null ? 0 : LANDING_WAIT_MS);
  }, [commit, vanish]);

  /** dragend: sem soltar num destino, o cartão volta para a coluna de onde saiu. */
  const end = useCallback(() => {
    if (starting.current) { cancelAnimationFrame(starting.current); starting.current = 0; return; }
    const state = current.current;
    if (state?.phase === "drag") land(state.from);
  }, [land]);

  /** O cartão está fora do quadro (na mão, ou ainda a caminho do destino). */
  const isAway = useCallback((id: string, column: string) => {
    if (!drag || drag.id !== id) return false;
    return drag.phase === "drag" || column !== drag.target;
  }, [drag]);

  return { drag, ghostRef, start, land, end, isAway, origin: drag ? origin(drag) : null };
}
