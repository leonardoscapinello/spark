import { useEffect, useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import { FLIP_ATTRIBUTE, animateFlip, measureRects, type FlipOptions, type RectMap } from "./flip.js";

export interface FlipLayoutHandle {
  /** Refaz a foto de referência depois de uma mudança imperativa no DOM. */
  snapshot: () => void;
}

export interface FlipLayoutOptions extends FlipOptions {
  enabled?: boolean;
  /** Roda a cada commit antes de medir; hora de retirar elementos provisórios. */
  onBeforeMeasure?: () => void;
}

/**
 * FLIP dirigido pelo React: a cada commit compara a posição dos elementos
 * `data-flip-id` do container com a do commit anterior e anima a diferença.
 * Só mede quando a lista de ids muda (reordenação, entrada, saída); rolagem e
 * redimensionamento invalidam a referência em vez de gerar movimento falso.
 */
export function useFlipLayout(containerRef: RefObject<HTMLElement | null>, options: FlipLayoutOptions = {}): FlipLayoutHandle {
  const previous = useRef<RectMap | null>(null);
  const previousIds = useRef<string>("");
  const dirty = useRef(false);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || optionsRef.current.enabled === false) return;
    optionsRef.current.onBeforeMeasure?.();
    const ids = Array.from(container.querySelectorAll(`[${FLIP_ATTRIBUTE}]`), (element) => element.getAttribute(FLIP_ATTRIBUTE) ?? "").join("\n");
    if (ids === previousIds.current && previous.current && !dirty.current) return;
    if (previous.current && !dirty.current) {
      const { enabled: _enabled, onBeforeMeasure: _before, ...flipOptions } = optionsRef.current;
      animateFlip(container, previous.current, flipOptions);
    }
    previous.current = measureRects(container);
    previousIds.current = ids;
    dirty.current = false;
  });

  useEffect(() => {
    const invalidate = () => {
      dirty.current = true;
    };
    window.addEventListener("scroll", invalidate, { capture: true, passive: true });
    window.addEventListener("resize", invalidate, { passive: true });
    return () => {
      window.removeEventListener("scroll", invalidate, { capture: true });
      window.removeEventListener("resize", invalidate);
    };
  }, []);

  return useMemo<FlipLayoutHandle>(() => ({
    snapshot: () => {
      const container = containerRef.current;
      if (!container) return;
      previous.current = measureRects(container);
      previousIds.current = Array.from(container.querySelectorAll(`[${FLIP_ATTRIBUTE}]`), (element) => element.getAttribute(FLIP_ATTRIBUTE) ?? "").join("\n");
      dirty.current = false;
    },
  }), [containerRef]);
}
