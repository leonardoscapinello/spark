import { useLayoutEffect, type RefObject } from "react";

/**
 * Indicador deslizante (origem: motor, "[data-slide] > [data-ind]"). Acha o
 * filho com data-on="true" e leva a folha [data-ind] até ele: largura, altura
 * e posição. A primeira posição não anima — data-ready só entra depois de dois
 * quadros, e é ele que liga a transição de 550 ms (src/identidade.css).
 * `line` desenha um sublinhado de 2px na base do item (abas sublinhadas).
 */
export function useSlidingIndicator(container: RefObject<HTMLElement | null>, activeKey: unknown) {
  useLayoutEffect(() => {
    const root = container.current;
    if (!root) return;
    const place = () => {
      const indicator = root.querySelector<HTMLElement>(":scope > [data-ind]");
      if (!indicator) return;
      const active = root.querySelector<HTMLElement>(':scope > [data-on="true"]');
      if (!active || !active.offsetWidth) { indicator.style.opacity = "0"; return; }
      const line = indicator.getAttribute("data-ind") === "line";
      indicator.style.width = `${active.offsetWidth}px`;
      indicator.style.height = `${line ? 2 : active.offsetHeight}px`;
      indicator.style.transform = `translate(${active.offsetLeft}px, ${line ? active.offsetTop + active.offsetHeight - 2 : active.offsetTop}px)`;
      indicator.style.opacity = "1";
      if (!root.hasAttribute("data-ready")) requestAnimationFrame(() => requestAnimationFrame(() => root.setAttribute("data-ready", "")));
    };
    place();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(place);
    observer?.observe(root);
    void document.fonts?.ready.then(place);
    return () => observer?.disconnect();
  }, [container, activeKey]);
}
