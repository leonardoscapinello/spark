import { flushSync } from "react-dom";
import { prefersReducedMotion } from "./useReducedMotion.js";

/**
 * Morph de layout (View Transitions): fotografa a tela, aplica a mudança de
 * estado e anima cada elemento com `view-transition-name` da posição e do
 * tamanho antigos até os novos; quem entra ou sai desliza e funde
 * (identidade.css). Nada teletransporta. Sem suporte ou com movimento
 * reduzido, a mudança acontece direto.
 */
export function withViewTransition(update: () => void) {
  if (typeof document === "undefined" || typeof document.startViewTransition !== "function" || prefersReducedMotion()) {
    update();
    return;
  }
  document.startViewTransition(() => flushSync(update));
}
