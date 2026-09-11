import { Radio } from "@base-ui/react/radio";
import { RadioGroup as BaseRadioGroup } from "@base-ui/react/radio-group";
import { useId, type ComponentProps } from "react";
import s from "../shared/choices.module.css";
export interface RadioOption { value: string; label: string; disabled?: boolean }
export function RadioGroup({ label, options, ...props }: Omit<ComponentProps<typeof BaseRadioGroup>, "children"> & { label: string; options: readonly RadioOption[] }) {
  const id = useId();
  return <div className={s.group}><span id={id} className={s.legend}>{label}</span><BaseRadioGroup aria-labelledby={id} className={s.group} {...props}>{options.map(o => <label key={o.value} className={s.label}><Radio.Root value={o.value} disabled={o.disabled ?? false} className={s.radio}><Radio.Indicator className={s.dot} /></Radio.Root>{o.label}</label>)}</BaseRadioGroup></div>;
}
