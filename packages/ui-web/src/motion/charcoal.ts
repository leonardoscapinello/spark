import { lightTheme } from "@spark/tokens/native-theme";
import { prefersReducedMotion } from "./useReducedMotion.js";

const EASE = lightTheme.ease as string;
const IN_MS = 420;
const OUT_MS = 320;
let canvas: CanvasRenderingContext2D | null | undefined;

type Mark = HTMLSpanElement & { gone?: boolean; turn?: number };

/**
 * Senha a carvão (origem: motor, "Senha a carvão"). O input continua sendo o
 * input real — só o texto fica transparente (CSS) — e cada caractere vira uma
 * marca de carvão desenhada no overlay, que nasce de um borrão e se dissolve ao
 * apagar. O overlay é aria-hidden e não recebe ponteiro.
 */
export function syncCharcoal(input: HTMLInputElement, overlay: HTMLElement) {
  if (input.type !== "password") {
    overlay.replaceChildren();
    overlay.style.display = "none";
    return;
  }
  overlay.style.display = "flex";
  const cs = getComputedStyle(input);
  canvas ??= document.createElement("canvas").getContext("2d");
  const bulletWidth = (canvas ? (canvas.font = cs.font, canvas.measureText("•").width) : 6) + (Number.parseFloat(cs.letterSpacing) || 0);
  overlay.style.left = `${input.offsetLeft + Number.parseFloat(cs.paddingLeft)}px`;
  overlay.style.top = `${input.offsetTop}px`;
  overlay.style.height = `${input.offsetHeight}px`;
  overlay.style.width = `${Math.max(0, input.clientWidth - Number.parseFloat(cs.paddingLeft) - Number.parseFloat(cs.paddingRight))}px`;
  const ink = cs.caretColor || cs.color;
  const want = input.value.length;
  const live = (Array.from(overlay.children) as Mark[]).filter(mark => !mark.gone);
  const reduce = prefersReducedMotion();
  for (let k = live.length; k < want; k += 1) {
    const seed = ((k * 9301 + 49297) % 233280) / 233280;
    const width = 6.4 + seed * 2.2;
    const height = width * (0.82 + ((k * 37) % 10) / 40);
    const turn = Math.round((seed - 0.5) * 70);
    const mark = document.createElement("span") as Mark;
    mark.turn = turn;
    mark.style.cssText = `flex:none;display:block;width:${width}px;height:${height}px;margin-right:${Math.max(1, bulletWidth - width)}px;border-radius:52% 46% 55% 44% / 48% 56% 44% 52%;background:radial-gradient(ellipse at 42% 40%,${ink} 0%,${ink} 34%,color-mix(in oklab,${ink} 55%,transparent) 56%,transparent 74%);box-shadow:${-2.5 - seed}px ${1.5 + seed}px 0 -2.3px color-mix(in oklab,${ink} 45%,transparent),${2.6 + seed}px -1.8px 0 -2.5px color-mix(in oklab,${ink} 35%,transparent),.5px 3px 0 -2.6px color-mix(in oklab,${ink} 30%,transparent);opacity:${0.78 + seed * 0.2};transform:rotate(${turn}deg)`;
    overlay.appendChild(mark);
    if (!reduce) {
      mark.animate(
        [
          { transform: `rotate(${turn}deg) scale(.15)`, filter: "blur(2.5px)", opacity: 0 },
          { transform: `rotate(${turn}deg) scale(1.18)`, filter: "blur(.6px)", opacity: 1, offset: 0.45 },
          { transform: `rotate(${turn}deg) scale(1)`, filter: "blur(.25px)" },
        ],
        { duration: IN_MS, easing: EASE },
      );
    }
  }
  for (let j = live.length - 1; j >= want; j -= 1) {
    const mark = live[j];
    if (!mark) continue;
    mark.gone = true;
    if (reduce) { mark.remove(); continue; }
    mark.animate(
      [{ opacity: mark.style.opacity }, { opacity: 0, filter: "blur(3px)", transform: `rotate(${mark.turn ?? 0}deg) scale(1.5) translateX(3px)` }],
      { duration: OUT_MS, easing: EASE, fill: "forwards" },
    ).onfinish = () => mark.remove();
  }
}
