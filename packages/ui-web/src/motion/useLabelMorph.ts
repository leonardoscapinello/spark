import { useLayoutEffect, useRef, type RefObject } from "react";
import { lightTheme } from "@spark/tokens/native-theme";
import { prefersReducedMotion } from "./useReducedMotion.js";

const EASE = lightTheme.ease as string;
const WIDTH_MS = Number.parseFloat(lightTheme["t-default"]);
const LABEL_MS = Number.parseFloat(lightTheme["t-label"]);

/**
 * Rótulo que muda, forma que escoa (origem: motor, "todo <button>"). Quando o
 * texto do botão troca (Salvar → Salvando…), a largura escoa da antiga para a
 * nova em 550 ms e o texto novo surge de um leve desfoque em 460 ms. Botão com
 * largura imposta pelo layout (width em %) não morfa.
 */
export function useLabelMorph(ref: RefObject<HTMLElement | null>, label: string | null) {
  const lastWidth = useRef<number | null>(null);
  const lastLabel = useRef<string | null>(label);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const width = el.getBoundingClientRect().width;
    const previous = lastWidth.current;
    const changed = lastLabel.current !== label;
    lastWidth.current = width;
    lastLabel.current = label;
    if (!changed || previous == null || label == null || prefersReducedMotion()) return;
    if (!el.offsetParent || Math.abs(previous - width) < 1.5 || el.style.width) return;
    el.animate([{ width: `${previous}px`, overflow: "hidden" }, { width: `${width}px`, overflow: "hidden" }], { duration: WIDTH_MS, easing: EASE });
    el.querySelector("[data-lbl]")?.animate(
      [{ opacity: 0, filter: "blur(3px)", transform: "translateY(2px)" }, { opacity: 1, filter: "blur(0)", transform: "none" }],
      { duration: LABEL_MS, easing: EASE },
    );
  }, [ref, label]);
}
