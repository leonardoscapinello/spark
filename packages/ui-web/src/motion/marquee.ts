import type { MouseEvent } from "react";

/** Rótulo que não cabe desliza de lado a lado no hover (marquee). A física mora em `[data-lbl][data-mq]` (identidade.css). */
export function startMarquee(event: MouseEvent<HTMLElement>) {
  const label = event.currentTarget.querySelector<HTMLElement>("[data-lbl]");
  if (!label) return;
  const overflow = label.scrollWidth - label.clientWidth;
  if (overflow <= 1) return;
  label.style.setProperty("--mq", `-${overflow + 8}px`);
  label.style.setProperty("--mqd", `${Math.max(1.6, overflow / 35)}s`);
  label.setAttribute("data-mq", "");
}

export function stopMarquee(event: MouseEvent<HTMLElement>) {
  event.currentTarget.querySelector("[data-lbl]")?.removeAttribute("data-mq");
}
