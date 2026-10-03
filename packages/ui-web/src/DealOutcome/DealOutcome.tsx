import { useEffect, useState } from "react";
import { Icon } from "../Icon/Icon.js";
import styles from "./DealOutcome.module.css";

export type DealOutcome = { status: "won" | "lost"; name?: string };

export function celebrateDealOutcome(outcome: DealOutcome): void {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent<DealOutcome>("spark:deal-outcome", { detail: outcome }));
}

function isDealOutcome(value: unknown): value is DealOutcome {
  if (!value || typeof value !== "object") return false;
  const candidate = value as { status?: unknown; name?: unknown };
  return (candidate.status === "won" || candidate.status === "lost") && (candidate.name === undefined || typeof candidate.name === "string");
}

/**
 * Aviso de desfecho (origem: Feedback, "Toast"): pílula de carvão que sobe do
 * fundo suave, com o disco do estado que dá um pulo (ganho ainda solta um
 * halo). Sai descendo e desfocando, nunca some seco.
 */
export function DealOutcomeCelebration() {
  const [outcome, setOutcome] = useState<DealOutcome | null>(null);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const listener = (event: Event) => {
      if (!(event instanceof CustomEvent) || !isDealOutcome(event.detail)) return;
      setOutcome(event.detail);
      setLeaving(false);
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => setLeaving(true), 2200);
    };
    window.addEventListener("spark:deal-outcome", listener);
    return () => { window.removeEventListener("spark:deal-outcome", listener); if (timeout) clearTimeout(timeout); };
  }, []);

  if (!outcome) return null;
  const won = outcome.status === "won";
  return <div className={styles.root} data-outcome={outcome.status} data-leaving={leaving || undefined} role="status" aria-live="polite" onAnimationEnd={(event) => { if (leaving && event.target === event.currentTarget) setOutcome(null); }}>
    <span className={styles.mark} aria-hidden="true"><Icon name={won ? "check" : "minus"} /></span>
    <span className={styles.copy}><strong>{won ? "Negócio ganho" : "Negócio perdido"}</strong><span>{outcome.name ?? (won ? "Boa notícia para o funil." : "O motivo fica registrado para o próximo aprendizado.")}</span></span>
  </div>;
}
