import { useSyncExternalStore } from "react";

const query = "(prefers-reduced-motion: reduce)";
let media: MediaQueryList | undefined;
function getMedia() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return undefined;
  return media ??= window.matchMedia(query);
}
function subscribe(onChange: () => void) {
  const preference = getMedia();
  preference?.addEventListener("change", onChange);
  return () => preference?.removeEventListener("change", onChange);
}
function getSnapshot() { return getMedia()?.matches ?? true; }
function getServerSnapshot() { return true; }

/** Uma consulta compartilhada; SSR estático e preferência atualizada em tempo real. */
export function useReducedMotion() { return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot); }

/** Leitura pontual, fora do React (animações imperativas com WAAPI). */
export function prefersReducedMotion() { return getMedia()?.matches ?? true; }
