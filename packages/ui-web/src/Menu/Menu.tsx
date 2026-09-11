import { lightTheme } from "@spark/tokens/native-theme";
import { Menu as BaseMenu } from "@base-ui/react/menu";
import type { ComponentProps, ReactElement, ReactNode } from "react";
import { Button, type ButtonProps } from "../Button/Button.js";
import { Icon } from "../Icon/Icon.js";
import s from "../shared/surfaces.module.css";
import styles from "./Menu.module.css";
export const Menu = BaseMenu.Root;
export const MenuTrigger = BaseMenu.Trigger;
export function MenuContent({ children, ...props }: ComponentProps<typeof BaseMenu.Popup>) {
  return <BaseMenu.Portal><BaseMenu.Positioner sideOffset={Number.parseFloat(lightTheme["space-1"])} align="start" className={s.positioner}><BaseMenu.Popup className={s.popup} {...props}>{children}</BaseMenu.Popup></BaseMenu.Positioner></BaseMenu.Portal>;
}
export function MenuItem({ icon, shortcut, danger, children, ...props }: ComponentProps<typeof BaseMenu.Item> & { icon?: ReactNode; shortcut?: string; danger?: boolean }) {
  return <BaseMenu.Item className={s.item} data-danger={danger || undefined} {...props}>{icon}<span className={s.label}>{children}</span>{shortcut && <span className={s.shortcut}>{shortcut}</span>}</BaseMenu.Item>;
}
export function MenuCheckboxItem({ children, ...props }: ComponentProps<typeof BaseMenu.CheckboxItem>) {
  return <BaseMenu.CheckboxItem className={s.item} {...props}><span className={s.indicator}><BaseMenu.CheckboxItemIndicator><Icon name="check" /></BaseMenu.CheckboxItemIndicator></span>{children}</BaseMenu.CheckboxItem>;
}
export function MenuSeparator() { return <BaseMenu.Separator className={s.separator} />; }
export function MenuGroup({ label, children }: { label: string; children: ReactNode }) {
  return <BaseMenu.Group><BaseMenu.GroupLabel className={s.groupLabel}>{label}</BaseMenu.GroupLabel>{children}</BaseMenu.Group>;
}
export function MenuSubmenu({ label, children }: { label: string; children: ReactNode }) {
  return <BaseMenu.SubmenuRoot><BaseMenu.SubmenuTrigger className={s.item}><span className={s.label}>{label}</span><Icon name="right" /></BaseMenu.SubmenuTrigger><MenuContent>{children}</MenuContent></BaseMenu.SubmenuRoot>;
}
export function DropdownButton({ children, trigger, ...props }: Omit<ComponentProps<typeof BaseMenu.Root>, "children"> & { trigger: ReactElement; children: ReactNode }) {
  return <Menu {...props}><MenuTrigger render={trigger} /><MenuContent>{children}</MenuContent></Menu>;
}
/** Standard dropdown trigger: text, optional leading icon and optional chevron.
 * The existing Button owns appearance; Menu owns focus, keyboard and dismissal. */
export function MenuButton({ menu, indicator = true, children, ...props }: Omit<ButtonProps, "trailingIcon"> & { menu: ReactNode; indicator?: boolean }) {
  return <DropdownButton trigger={<Button {...props} trailingIcon={indicator ? <Icon name="chevron" /> : undefined}>{children}</Button>}>{menu}</DropdownButton>;
}
export function SplitButton({ children, menu, menuLabel = "Mais opções", shape = "pill", ...props }: ButtonProps & { menu: ReactNode; menuLabel?: string }) {
  return <div className={styles.root} role="group" aria-label={menuLabel}>
    <Button {...props} shape={shape} data-split-part="action">{children}</Button>
    <DropdownButton trigger={<Button type="button" data-split-part="menu" shape={shape} variant={props.variant ?? "primary"} disabled={props.disabled || props.loading} size={props.size ?? "md"} iconOnly aria-label={menuLabel} icon={<Icon name="chevron" />} />}>{menu}</DropdownButton>
  </div>;
}
