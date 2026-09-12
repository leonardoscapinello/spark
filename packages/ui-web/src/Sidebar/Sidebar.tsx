import { cloneElement, type ComponentProps, type ReactElement, type ReactNode } from "react";
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
export function SidebarSection({ title, children }: { title: string; children: ReactNode }) {
  return <section className={styles.section}><h3>{title}</h3>{children}</section>;
}
export function NavigationRail({ children, label = "Módulos", className }: { children: ReactNode; label?: string; className?: string | undefined }) {
  return <nav className={[styles.rail, className].filter(Boolean).join(" ")} aria-label={label}>{children}</nav>;
}
