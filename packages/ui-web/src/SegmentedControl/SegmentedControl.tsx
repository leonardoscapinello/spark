import { Button } from "../Button/Button.js";
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
}

export function SegmentedControl<Value extends string>({ label, value, options, onValueChange, className }: SegmentedControlProps<Value>) {
  return <div className={[styles.root, className].filter(Boolean).join(" ")} role="group" aria-label={label}>
    {options.map((option) => <Button
      key={option.value}
      type="button"
      size="sm"
      shape="rounded"
      variant={value === option.value ? "secondary" : "ghost"}
      aria-pressed={value === option.value}
      disabled={option.disabled}
      onClick={() => onValueChange(option.value)}
    >{option.label}</Button>)}
  </div>;
}
