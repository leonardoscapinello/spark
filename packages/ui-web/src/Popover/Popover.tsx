import { lightTheme } from "@spark/tokens/native-theme";
import { Popover as BasePopover } from "@base-ui/react/popover";
import type { ComponentProps, ReactNode } from "react";
import styles from "./Popover.module.css";
import { Glass } from "../Glass/Glass.js";
import s from "../shared/surfaces.module.css";
export const Popover = BasePopover.Root;
export const PopoverTrigger = BasePopover.Trigger;
export const PopoverClose = BasePopover.Close;
export function PopoverContent({ title, children, className, contentClassName, ...props }: Omit<ComponentProps<typeof BasePopover.Popup>, "title"> & { title: ReactNode; contentClassName?: string }) {
  return <BasePopover.Portal><BasePopover.Positioner sideOffset={Number.parseFloat(lightTheme["pop-gap"])} className={s.positioner}><BasePopover.Popup render={<Glass tier="panel" />} className={[s.popup, styles.popup, className].filter(Boolean).join(" ")} {...props}><BasePopover.Title className={styles.title}>{title}</BasePopover.Title><div className={[styles.content, contentClassName].filter(Boolean).join(" ")}>{children}</div></BasePopover.Popup></BasePopover.Positioner></BasePopover.Portal>;
}
