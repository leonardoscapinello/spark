import { Button } from "../Button/Button.js";
import { Icon } from "../Icon/Icon.js";
import styles from "./ViewSwitcher.module.css";

export type ViewMode = "cards" | "table";
export interface ViewSwitcherProps {
  value: ViewMode;
  onValueChange: (value: ViewMode) => void;
  label: string;
}

export function ViewSwitcher({ value, onValueChange, label }: ViewSwitcherProps) {
  return <div className={styles.root} role="group" aria-label={label}>
    <Button iconOnly size="sm" variant={value === "cards" ? "raised" : "ghost"} aria-label="Visualização em cartões" aria-pressed={value === "cards"} onClick={() => onValueChange("cards")}><Icon name="grid" /></Button>
    <Button iconOnly size="sm" variant={value === "table" ? "raised" : "ghost"} aria-label="Visualização em tabela" aria-pressed={value === "table"} onClick={() => onValueChange("table")}><Icon name="menu" /></Button>
  </div>;
}
