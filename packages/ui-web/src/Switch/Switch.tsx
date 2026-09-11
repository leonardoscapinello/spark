import { Switch as BaseSwitch } from "@base-ui/react/switch";
import type { ComponentProps, ReactNode } from "react";
import s from "../shared/choices.module.css";
export function Switch({ children, ...props }: Omit<ComponentProps<typeof BaseSwitch.Root>, "children"> & { children: ReactNode }) {
  return <label className={s.label}><BaseSwitch.Root className={s.switch} {...props}><BaseSwitch.Thumb className={s.thumb} /></BaseSwitch.Root><span>{children}</span></label>;
}
