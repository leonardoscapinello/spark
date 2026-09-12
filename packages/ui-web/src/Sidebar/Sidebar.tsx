import { cloneElement, useId, useState, type ComponentProps, type ReactElement, type ReactNode } from "react";
import { Icon } from "../Icon/Icon.js";
import styles from "./Sidebar.module.css";
export interface SidebarProps { title: string; children: ReactNode; actions?: ReactNode; footer?: ReactNode; brand?: ReactNode; className?: string | undefined }
export function Sidebar({ title, children, actions, footer, brand, className }: SidebarProps) {
  return <nav aria-label={title} className={[styles.root, className].filter(Boolean).join(" ")}>{brand && <div className={styles.brand}>{brand}</div>}<header className={styles.header}><h2>{title}</h2>{actions}</header><div className={styles.body}>{children}</div>{footer && <footer className={styles.footer}>{footer}</footer>}</nav>;
}
export function SidebarItem({ active, icon, count, children, className, render, ...props }: ComponentProps<"a"> & { active?: boolean; icon?: ReactNode; count?: number | undefined; render?: ReactElement }) {
  const content = <>{icon}<span className={styles.label}>{children}</span>{count !== undefined && <span className={styles.count}>{count}</span>}</>;
  const linkProps = { ...props, className: [styles.item, className].filter(Boolean).join(" "), "aria-current": active ? "page" as const : undefined, children: content };
  return render ? cloneElement(render as ReactElement<ComponentProps<"a">>, linkProps) : <a {...linkProps} />;
}
export function SidebarSection({ title, children, collapsible = false, defaultOpen = false }: { title: string; children: ReactNode; collapsible?: boolean; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const contentId = useId();
  return <section className={styles.section} data-collapsible={collapsible || undefined}>
    {collapsible
      ? <button type="button" className={styles.sectionToggle} aria-expanded={open} aria-controls={contentId} onClick={() => setOpen((value) => !value)}><span>{title}</span><Icon name="right" /></button>
      : <h3>{title}</h3>}
    {collapsible ? <div id={contentId} className={styles.sectionItems} data-open={open || undefined} aria-hidden={!open} inert={!open}><div className={styles.sectionItemsInner}>{children}</div></div> : children}
  </section>;
}
export function NavigationRail({ children, label = "Módulos", className, ...props }: ComponentProps<"nav"> & { children: ReactNode; label?: string; className?: string | undefined }) {
  return <nav {...props} className={[styles.rail, className].filter(Boolean).join(" ")} aria-label={label}>{children}</nav>;
}
