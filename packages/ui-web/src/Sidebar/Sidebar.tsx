import type { ComponentProps, ReactNode } from "react";
import styles from "./Sidebar.module.css";
export interface SidebarProps { title: string; children: ReactNode; actions?: ReactNode; footer?: ReactNode }
export function Sidebar({ title, children, actions, footer }: SidebarProps) {
  return <nav aria-label={title} className={styles.root}><header className={styles.header}><h2>{title}</h2>{actions}</header><div className={styles.body}>{children}</div>{footer && <footer className={styles.footer}>{footer}</footer>}</nav>;
}
export function SidebarItem({ active, icon, count, children, className, ...props }: ComponentProps<"a"> & { active?: boolean; icon?: ReactNode; count?: number | undefined }) {
  return <a className={[styles.item, className].filter(Boolean).join(" ")} aria-current={active ? "page" : undefined} {...props}>{icon}<span className={styles.label}>{children}</span>{count !== undefined && <span className={styles.count}>{count}</span>}</a>;
}
export function SidebarSection({ title, children }: { title: string; children: ReactNode }) {
  return <section className={styles.section}><h3>{title}</h3>{children}</section>;
}
export function NavigationRail({ children, label = "Módulos" }: { children: ReactNode; label?: string }) {
  return <nav className={styles.rail} aria-label={label}>{children}</nav>;
}
