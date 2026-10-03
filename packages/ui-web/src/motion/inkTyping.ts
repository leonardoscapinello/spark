import { lightTheme } from "@spark/tokens/native-theme";
import { prefersReducedMotion } from "./useReducedMotion.js";

const EASE = lightTheme.ease as string;
const PULSE_MS = 480;
const SMUDGE_MS = 420;
const THREAD_MS = 520;
const THROTTLE_MS = 140;
const pulsed = new WeakMap<Element, number>();
let canvas: CanvasRenderingContext2D | null | undefined;

function surfaceOf(target: HTMLElement): HTMLElement | null {
  for (let el: HTMLElement | null = target; el && el !== document.body; el = el.parentElement) {
    if (el.hasAttribute("data-ink-stop")) return null;
    if (Number.parseFloat(getComputedStyle(el).borderTopLeftRadius) >= 18) return el;
  }
  return null;
}

function backgroundOf(target: HTMLElement): string | null {
  for (let el: HTMLElement | null = target; el && el !== document.body; el = el.parentElement) {
    const bg = getComputedStyle(el).backgroundColor;
    if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") return bg;
  }
  return null;
}

function ghost(parent: HTMLElement, css: string): HTMLSpanElement {
  const span = document.createElement("span");
  span.setAttribute("data-instant", "");
  span.setAttribute("aria-hidden", "true");
  span.style.cssText = `position:absolute;pointer-events:none;z-index:2;${css}`;
  parent.appendChild(span);
  return span;
}

/**
 * Tinta ao digitar (origem: motor, "Digitação: respiro do campo + letra que
 * surge"). A caixa do campo respira (escala 1.0015 + contorno de grafite em
 * 480 ms) e cada caractere inserido nasce de um borrão do papel com um fio de
 * tinta que se dissolve. Os nós extras são do próprio efeito e somem ao fim.
 */
export function inkTyping(event: InputEvent) {
  const input = event.target as HTMLInputElement | HTMLTextAreaElement | null;
  if (!input || prefersReducedMotion()) return;
  if (input instanceof HTMLInputElement && (input.type === "range" || input.type === "file" || input.type === "password")) return;
  const box = surfaceOf(input);
  const now = performance.now();
  if (box && box.animate && now - (pulsed.get(box) ?? 0) > THROTTLE_MS) {
    pulsed.set(box, now);
    const ring = getComputedStyle(box).getPropertyValue("--ring").trim();
    box.animate(
      [
        { transform: "scale(1)", outline: "0 solid transparent" },
        { transform: "scale(1.0015)", outline: `1px solid ${ring}`, outlineOffset: "1px", offset: 0.3 },
        { transform: "scale(1)", outline: "1px solid transparent", outlineOffset: "2px" },
      ],
      { duration: PULSE_MS, easing: EASE },
    );
  }
  if (!(event.inputType ?? "").startsWith("insert") || !event.data || !(input instanceof HTMLInputElement)) return;
  const bg = backgroundOf(input);
  const parent = (input.offsetParent ?? input.parentElement) as HTMLElement | null;
  if (!bg || !parent) return;
  try {
    const cs = getComputedStyle(input);
    canvas ??= document.createElement("canvas").getContext("2d");
    if (!canvas) return;
    canvas.font = cs.font;
    const position = input.selectionEnd ?? input.value.length;
    const before = canvas.measureText(input.value.slice(0, position)).width;
    const charWidth = canvas.measureText(event.data).width;
    const inputRect = input.getBoundingClientRect();
    const parentRect = parent.getBoundingClientRect();
    const x = inputRect.left - parentRect.left + Number.parseFloat(cs.paddingLeft) + before - charWidth - input.scrollLeft;
    if (getComputedStyle(parent).position === "static") parent.style.position = "relative";
    const smudge = ghost(parent, `left:${x - 1}px;top:${inputRect.top - parentRect.top + inputRect.height * 0.18}px;width:${charWidth + 3}px;height:${inputRect.height * 0.64}px;border-radius:3px;background:${bg}`);
    smudge.animate(
      [{ opacity: 1, clipPath: "inset(0 0 0 0)" }, { opacity: 0.85, clipPath: "inset(0 0 55% 0)", offset: 0.45 }, { opacity: 0, transform: "translateY(-3px)", clipPath: "inset(0 0 100% 0)" }],
      { duration: SMUDGE_MS, easing: EASE, fill: "forwards" },
    ).onfinish = () => smudge.remove();
    const thread = ghost(parent, `left:${x}px;top:${inputRect.top - parentRect.top + inputRect.height * 0.78}px;width:${Math.max(4, charWidth)}px;height:1.5px;border-radius:2px;background:${cs.color}`);
    thread.animate(
      [{ opacity: 0.55 }, { opacity: 0, transform: "translateX(5px) scaleX(1.6)", filter: "blur(2px)" }],
      { duration: THREAD_MS, easing: EASE, fill: "forwards" },
    ).onfinish = () => thread.remove();
  } catch {
    /* efeito é ornamento: medir texto falhar não pode quebrar a digitação */
  }
}
