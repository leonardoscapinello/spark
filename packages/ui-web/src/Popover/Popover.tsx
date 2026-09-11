import { lightTheme } from "@spark/tokens/native-theme";
import { Popover as BasePopover } from "@base-ui/react/popover";
import type { ComponentProps, ReactNode } from "react";
import styles from "./Popover.module.css";
import s from "../shared/surfaces.module.css";
export const Popover = BasePopover.Root;
export const PopoverTrigger = BasePopover.Trigger;
export const PopoverClose = BasePopover.Close;
export function PopoverContent({ title, children, ...props }: Omit<ComponentProps<typeof BasePopover.Popup>, "title"> & { title: ReactNode }) {
  return <BasePopover.Portal><BasePopover.Positioner sideOffset={Number.parseFloat(lightTheme["space-1"])} className={s.positioner}><BasePopover.Popup className={`${s.popup} ${styles.popup}`} {...props}><BasePopover.Title className={styles.title}>{title}</BasePopover.Title><div className={styles.content}>{children}</div></BasePopover.Popup></BasePopover.Positioner></BasePopover.Portal>;
}
