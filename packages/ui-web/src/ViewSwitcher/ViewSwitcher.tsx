import { useRef } from "react";
import { Icon, type IconName } from "../Icon/Icon.js";
import { useSlidingIndicator } from "../motion/useSlidingIndicator.js";
import styles from "./ViewSwitcher.module.css";

export type ViewMode = "cards" | "table";
export interface ViewOption<Value extends string> { value: Value; label: string; icon: IconName }
export interface ViewSwitcherProps<Value extends string = ViewMode> {
  value: Value;
  onValueChange: (value: Value) => void;
  label: string;
  /** Visualizações oferecidas. Padrão: cartões e tabela. O rótulo é o que o leitor de tela anuncia. */
  views?: readonly ViewOption<Value>[] | undefined;
}

const VIEWS: readonly ViewOption<ViewMode>[] = [
  { value: "cards", label: "Visualização em cartões", icon: "grid" },
  { value: "table", label: "Visualização em tabela", icon: "list" },
];

/** Grupo de visualização (origem: Botões, "Só ícone · grupo"): trilho cavado e
 * folha erguida que desliza até a visualização ativa. */
export function ViewSwitcher<Value extends string = ViewMode>({ value, onValueChange, label, views }: ViewSwitcherProps<Value>) {
  const root = useRef<HTMLDivElement>(null);
  const options = views ?? (VIEWS as unknown as readonly ViewOption<Value>[]);
  useSlidingIndicator(root, value);
  return <div ref={root} data-slide="" className={styles.root} role="group" aria-label={label}>
    <span data-ind="" aria-hidden="true" className={styles.indicator} />
    {options.map(view => <button
      key={view.value}
      type="button"
      data-press="ghost"
      data-on={value === view.value}
      className={styles.item}
      aria-label={view.label}
      aria-pressed={value === view.value}
      onClick={() => onValueChange(view.value)}
    ><Icon name={view.icon} /></button>)}
  </div>;
}
