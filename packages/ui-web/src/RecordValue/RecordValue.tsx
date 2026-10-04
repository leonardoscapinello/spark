import type { ReactNode } from "react";
import { AnimatedValue } from "../Card/AnimatedValue.js";
import { Icon } from "../Icon/Icon.js";
import styles from "./RecordValue.module.css";

export interface RecordValueProps {
  value: string;
  animationPaused?: boolean;
  onClick: () => void;
  hint?: ReactNode;
}

/** Valor na identidade do registro; a composição comercial fica a um clique. */
export function RecordValue({ value, animationPaused = false, onClick, hint }: RecordValueProps) {
  return <div className={styles.root}>
    <button type="button" className={styles.trigger} onClick={onClick} aria-label={`Valor do negócio: ${value}. Ver itens e valores`} title="Ver itens e valores">
      <span className={styles.value}><AnimatedValue value={value} paused={animationPaused} /></span>
      <Icon name="right" />
    </button>
    {hint && <span className={styles.hint}>{hint}</span>}
  </div>;
}
