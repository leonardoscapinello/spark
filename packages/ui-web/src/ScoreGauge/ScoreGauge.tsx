import { Icon } from "../Icon/Icon.js";
import styles from "./ScoreGauge.module.css";

export interface ScoreGaugeProps {
  value: number;
  /** Snapshot comparable de sete dias atrás; ausência nunca significa estabilidade. */
  previousValue?: number | null;
}

export function ScoreGauge({ value, previousValue }: ScoreGaugeProps) {
  const known = Number.isFinite(value);
  const score = known ? Math.round(Math.max(0, Math.min(100, value))) : 0;
  const previous = previousValue != null && Number.isFinite(previousValue)
    ? Math.round(Math.max(0, Math.min(100, previousValue))) : null;
  const delta = known && previous !== null ? score - previous : null;
  const direction = delta === null ? "unknown" : delta > 0 ? "up" : delta < 0 ? "down" : "stable";
  return <div className={styles.root}>
    <span className={styles.label}>Score</span>
    <div className={styles.measure}>
      <div className={styles.gauge} role="meter" aria-label="Score" aria-valuemin={0} aria-valuemax={100} {...(known ? { "aria-valuenow": score } : {})} aria-valuetext={known ? `${score} de 100` : "Sem dados"}>
        <svg viewBox="0 0 120 76" aria-hidden="true">
          <path className={styles.track} d="M 10 60 A 50 50 0 0 1 110 60" pathLength="100" />
          {known && <path className={styles.fill} d="M 10 60 A 50 50 0 0 1 110 60" pathLength="100" strokeDasharray="100" strokeDashoffset={100 - score} />}
        </svg>
        <span className={styles.number} aria-hidden="true">{known ? score : "—"}<small>de 100</small></span>
      </div>
      <div className={styles.comparison} data-direction={direction}>
        <span className={styles.change}>
          {delta !== null && <Icon name={delta > 0 ? "arrowUp" : delta < 0 ? "arrowDown" : "arrowRight"} />}
          {delta === null ? "Sem comparação semanal" : delta === 0 ? "Sem mudança" : `${delta > 0 ? "+" : ""}${delta} ${Math.abs(delta) === 1 ? "ponto" : "pontos"}`}
        </span>
        <span className={styles.caption}>{delta === null ? "Histórico ainda indisponível" : "Comparado há 7 dias"}</span>
      </div>
    </div>
  </div>;
}
