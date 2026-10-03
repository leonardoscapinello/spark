import { useRef } from "react";
import { useSlidingIndicator } from "../motion/useSlidingIndicator.js";
import styles from "./SegmentedControl.module.css";

export interface SegmentedOption<Value extends string> {
  value: Value;
  label: string;
  disabled?: boolean;
}

export interface SegmentedControlProps<Value extends string> {
  label: string;
  value: Value;
  options: readonly SegmentedOption<Value>[];
  onValueChange: (value: Value) => void;
  className?: string | undefined;
  /** papel (padrão): fundo cavado, folha branca desliza. carvão: troca de modo principal da tela. */
  tone?: "papel" | "carvao";
  size?: "sm" | "md";
}

/** Segmentado (origem: Controles, "Segmentado"): a folha do item ativo desliza
 * até ele em 550 ms; o item ativo não pinta a si mesmo. */
export function SegmentedControl<Value extends string>({ label, value, options, onValueChange, className, tone = "papel", size = "md" }: SegmentedControlProps<Value>) {
  const root = useRef<HTMLDivElement>(null);
  useSlidingIndicator(root, value);
  return <div ref={root} data-slide="" data-tone={tone} data-size={size} className={[styles.root, className].filter(Boolean).join(" ")} role="group" aria-label={label}>
    <span data-ind="" aria-hidden="true" className={styles.indicator} />
    {options.map((option) => <button
      key={option.value}
      type="button"
      data-press="ghost"
      data-on={value === option.value}
      className={styles.item}
      aria-pressed={value === option.value}
      disabled={option.disabled}
      onClick={() => onValueChange(option.value)}
    ><span data-lbl=""><span>{option.label}</span></span></button>)}
  </div>;
}
