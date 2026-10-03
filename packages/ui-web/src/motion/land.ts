/**
 * Movimento do kanban (origem: Perfil · Kanban §15, `kbLand`), lido dos
 * tokens para que design e código não divirjam:
 *
 * - o fantasma na mão segue o ponteiro inclinado (--drag-tilt) e erguido
 *   (--scale-drag), com a sombra de quem está segurado (--e3);
 * - ao soltar, o cartão real — já no lugar novo — parte de onde o fantasma
 *   estava e assenta em três tempos: ainda no ar (--e3), quase pousado (--e2),
 *   papel na mesa (--sh1), na curva de pouso (--ease-land);
 * - o espaço tracejado do destino nasce da altura zero (pfGrow da origem).
 *
 * Movimento reduzido: troca de lugar sem viagem.
 */
import { prefersReducedMotion } from "./useReducedMotion.js";

/** Duração do pouso na origem (1050 ms). Usada só enquanto não houver o token --t-land. */
const LAND_FALLBACK_MS = 1050;

export interface LandingOrigin {
  left: number;
  top: number;
}

function token(style: CSSStyleDeclaration, name: string): string {
  return style.getPropertyValue(name).trim();
}

function milliseconds(value: string): number | null {
  const amount = Number.parseFloat(value);
  if (!Number.isFinite(amount)) return null;
  return value.endsWith("ms") ? amount : value.endsWith("s") ? amount * 1000 : amount;
}

/** Posição do fantasma: canto do cartão sob o ponteiro, inclinado e erguido. */
export function ghostTransform(left: number, top: number): string {
  return `translate3d(${left}px, ${top}px, 0) rotate(var(--drag-tilt)) scale(var(--scale-drag))`;
}

/**
 * Pousa `element` vindo de `origin` (canto superior esquerdo do fantasma, em
 * coordenadas da janela). Proporções da origem: inclinação 1 → 0,625 → 0,22 →
 * −0,075 → 0 e escala 1 → 0,71 → 0,29 → −0,09 → 0 do quanto o cartão subiu.
 */
export function landFrom(element: HTMLElement, origin: LandingOrigin): Animation | null {
  if (prefersReducedMotion() || typeof element.animate !== "function") return null;
  const style = getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  const dx = origin.left - rect.left;
  const dy = origin.top - rect.top;
  const tilt = Number.parseFloat(token(style, "--drag-tilt")) || 0;
  const lift = (Number.parseFloat(token(style, "--scale-drag")) || 1) - 1;
  const held = token(style, "--e3") || "none";
  const raised = token(style, "--e2") || "none";
  const resting = token(style, "--sh1") || "none";
  const pose = (tiltShare: number, liftShare: number, x: number, y: number) => `translate(${x}px, ${y}px) rotate(${tilt * tiltShare}deg) scale(${1 + lift * liftShare})`;
  const animation = element.animate([
    { offset: 0, transform: pose(1, 1, dx, dy), boxShadow: held, opacity: 1 },
    { offset: 0.3, transform: pose(0.625, 0.714, dx * 0.35, dy * 0.35 - 6), boxShadow: held, opacity: 1 },
    { offset: 0.6, transform: pose(0.22, 0.286, 0, -3), boxShadow: raised, opacity: 1 },
    { offset: 0.82, transform: pose(-0.075, -0.086, 0, 1), boxShadow: resting, opacity: 1 },
    { offset: 1, transform: "none", boxShadow: resting, opacity: 1 },
  ], {
    duration: milliseconds(token(style, "--t-land")) ?? LAND_FALLBACK_MS,
    easing: token(style, "--ease-land") || "ease",
    fill: "forwards",
  });
  // Por cima dos vizinhos enquanto viaja; depois, de volta ao papel.
  element.style.zIndex = "6";
  const release = () => { element.style.zIndex = ""; };
  animation.addEventListener("finish", () => { release(); animation.cancel(); }, { once: true });
  animation.addEventListener("cancel", release, { once: true });
  return animation;
}

/** O espaço de destino abre da altura zero até a do cartão (pfGrow). */
export function growIn(element: HTMLElement): Animation | null {
  if (prefersReducedMotion() || typeof element.animate !== "function") return null;
  const style = getComputedStyle(element);
  return element.animate([{ height: "0px", opacity: 0 }, { height: `${element.offsetHeight}px`, opacity: 1 }], {
    duration: milliseconds(token(style, "--t-base")) ?? 0,
    easing: token(style, "--ease") || "ease",
  });
}

/** O fantasma que não tem onde pousar some como camada flutuante (--t-pop-out). */
export function fadeAway(element: HTMLElement): Promise<void> {
  if (prefersReducedMotion() || typeof element.animate !== "function") return Promise.resolve();
  const style = getComputedStyle(element);
  const animation = element.animate([{ opacity: 1 }, { opacity: 0, filter: "blur(1px)" }], {
    duration: milliseconds(token(style, "--t-pop-out")) ?? 0,
    easing: token(style, "--ease-out") || "ease",
    fill: "forwards",
  });
  return animation.finished.then(() => undefined, () => undefined);
}
