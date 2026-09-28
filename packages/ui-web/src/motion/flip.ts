/**
 * FLIP sem biblioteca: mede antes, muda o DOM, mede depois e anima a diferença
 * com a Web Animations API. Roda no compositor (só `transform` e `opacity`),
 * é interrompível (uma nova diferença parte da posição visual atual, não da
 * lógica) e respeita `prefers-reduced-motion` (Apple: movimento reduzido é
 * mais suave, não ausente; aqui a posição troca sem deslizar).
 *
 * Elementos participam ao carregar `data-flip-id`; a mola vem dos tokens
 * (`--motion-spring-*`), lidos do CSS para que design e código não divirjam.
 */
import { springLinear, type SpringSpec } from "@spark/tokens";

export const FLIP_ATTRIBUTE = "data-flip-id";
export type SpringName = "smooth" | "snappy" | "bouncy";
export type RectMap = Map<string, DOMRect>;

const SPRING_FALLBACK: Record<SpringName, SpringSpec> = {
  smooth: { duration: 0.45, bounce: 0 },
  snappy: { duration: 0.3, bounce: 0.15 },
  bouncy: { duration: 0.5, bounce: 0.3 },
};

export interface Timing {
  easing: string;
  duration: number;
}

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function canAnimate(element: Element): element is HTMLElement {
  return typeof (element as HTMLElement).animate === "function";
}

/**
 * Mola pronta dos tokens. Com velocidade inicial (unidades relativas por
 * segundo) a curva é recalculada em runtime a partir dos mesmos parâmetros,
 * para o movimento continuar de onde o gesto parou.
 */
export function springTiming(name: SpringName, velocity = 0, element?: Element | null): Timing {
  const spec = SPRING_FALLBACK[name];
  if (Math.abs(velocity) > 1e-3) {
    const { easing, durationMs } = springLinear(spec, velocity);
    return { easing, duration: durationMs };
  }
  if (typeof window !== "undefined" && typeof window.getComputedStyle === "function") {
    const style = window.getComputedStyle(element ?? document.documentElement);
    const easing = style.getPropertyValue(`--motion-spring-${name}`).trim();
    const duration = Number.parseFloat(style.getPropertyValue(`--motion-spring-${name}-duration`));
    if (easing && Number.isFinite(duration) && duration > 0) return { easing, duration };
  }
  const { easing, durationMs } = springLinear(spec);
  return { easing, duration: durationMs };
}

export function measureRects(container: ParentNode, selector = `[${FLIP_ATTRIBUTE}]`): RectMap {
  const rects: RectMap = new Map();
  for (const element of container.querySelectorAll<HTMLElement>(selector)) {
    const id = element.getAttribute(FLIP_ATTRIBUTE);
    if (id) rects.set(id, element.getBoundingClientRect());
  }
  return rects;
}

/** Deslocamento atual aplicado por `transform` (matrix ou matrix3d), em px. */
export function currentTranslate(element: Element): { x: number; y: number } {
  const transform = window.getComputedStyle(element).transform;
  if (!transform || transform === "none") return { x: 0, y: 0 };
  const values = transform.slice(transform.indexOf("(") + 1, -1).split(",").map(Number);
  if (transform.startsWith("matrix3d")) return { x: values[12] ?? 0, y: values[13] ?? 0 };
  return { x: values[4] ?? 0, y: values[5] ?? 0 };
}

export interface FlipOptions {
  spring?: SpringName;
  /** Ids que não devem animar (por exemplo um card cuja viagem outra animação já faz). */
  skip?: (id: string) => boolean;
  /** Elementos novos entram com um fade curto em vez de aparecer secos. */
  enter?: boolean;
}

/**
 * Anima cada elemento da posição registrada em `before` até a atual. Chame
 * depois da mudança de layout já aplicada.
 */
export function animateFlip(container: ParentNode, before: RectMap, options: FlipOptions = {}): void {
  if (prefersReducedMotion()) return;
  const timing = springTiming(options.spring ?? "smooth");
  for (const element of container.querySelectorAll<HTMLElement>(`[${FLIP_ATTRIBUTE}]`)) {
    const id = element.getAttribute(FLIP_ATTRIBUTE);
    if (!id || !canAnimate(element) || options.skip?.(id)) continue;
    const previous = before.get(id);
    if (!previous) {
      if (options.enter) {
        const entrance = element.animate(
          [{ opacity: 0, transform: "scale(0.97)" }, { opacity: 1, transform: "none" }],
          { duration: timing.duration, easing: timing.easing },
        );
        entrance.id = "flip-enter";
      }
      continue;
    }
    const current = element.getBoundingClientRect();
    let dx = previous.left - current.left;
    let dy = previous.top - current.top;
    const running = element.getAnimations().filter((animation) => animation.id === "flip");
    if (running.length > 0) {
      // Interrupção: parte de onde o elemento está na tela agora.
      const offset = currentTranslate(element);
      dx += offset.x;
      dy += offset.y;
      for (const animation of running) animation.cancel();
    }
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) continue;
    const animation = element.animate(
      [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }],
      { duration: timing.duration, easing: timing.easing },
    );
    animation.id = "flip";
  }
}

/** Mede, aplica `mutate` e anima o que se moveu. Para mudanças imperativas do DOM. */
export function flipAround(container: ParentNode, mutate: () => void, options?: FlipOptions): void {
  const before = measureRects(container);
  mutate();
  animateFlip(container, before, options);
}
