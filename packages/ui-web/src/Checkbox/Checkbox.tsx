import { Checkbox as BaseCheckbox } from "@base-ui/react/checkbox";
import type { ComponentProps, ReactNode } from "react";
import { Icon } from "../Icon/Icon.js";
import s from "../shared/choices.module.css";
export function Checkbox({ children, ...props }: Omit<ComponentProps<typeof BaseCheckbox.Root>, "children"> & { children: ReactNode }) {
  return <label className={s.label}><BaseCheckbox.Root className={s.checkbox} {...props}><BaseCheckbox.Indicator className={s.indicator}><Icon name={props.indeterminate ? "minus" : "check"} /></BaseCheckbox.Indicator></BaseCheckbox.Root><span>{children}</span></label>;
}
