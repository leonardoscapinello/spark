import { flushSync } from "react-dom";
import { prefersReducedMotion } from "./useReducedMotion.js";

/**
 * Morph de layout (View Transitions): fotografa a tela, aplica a mudança de
 * estado e anima cada elemento com `view-transition-name` da posição e do
 * tamanho antigos até os novos; quem entra ou sai desliza e funde
 * (identidade.css). Nada teletransporta. Sem suporte ou com movimento
 * reduzido, a mudança acontece direto.
 */
export function withViewTransition(update: () => void, kind?: string) {
  if (typeof document === "undefined" || typeof document.startViewTransition !== "function" || prefersReducedMotion()) {
    update();
    return;
  }
  // `kind` vai para <html data-transition> durante a troca: a tela decide,
  // por CSS, quem morfa (existe dos dois lados) e quem só entra ou sai.
  const root = document.documentElement;
  if (kind) root.dataset.transition = kind;
  const transition = document.startViewTransition(() => flushSync(update));
  void transition.finished.finally(() => { if (kind && root.dataset.transition === kind) delete root.dataset.transition; });
}
