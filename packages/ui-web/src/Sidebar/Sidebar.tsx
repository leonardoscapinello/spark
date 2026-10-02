import { cloneElement, useEffect, useId, useLayoutEffect, useRef, useState, type ComponentProps, type ReactElement, type ReactNode } from "react";
import { Icon } from "../Icon/Icon.js";
import styles from "./Sidebar.module.css";
export interface SidebarProps { title: string; children: ReactNode; actions?: ReactNode; footer?: ReactNode; className?: string | undefined }
export function Sidebar({ title, children, actions, footer, className }: SidebarProps) {
  const bodyRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    const measure = () => {
      const active = body.querySelector<HTMLElement>('[aria-current="page"]');
      body.dataset.selection = active ? "visible" : "hidden";
      if (!active) return;
      const parent = body.getBoundingClientRect();
      const rect = active.getBoundingClientRect();
      body.style.setProperty("--selection-x", `${rect.left - parent.left + body.scrollLeft}px`);
      body.style.setProperty("--selection-y", `${rect.top - parent.top + body.scrollTop}px`);
      body.style.setProperty("--selection-width", `${rect.width}px`);
      body.style.setProperty("--selection-height", `${rect.height}px`);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(body);
    const active = body.querySelector<HTMLElement>('[aria-current="page"]');
    if (active) observer.observe(active);
    body.addEventListener("transitionend", measure);
    return () => { observer.disconnect(); body.removeEventListener("transitionend", measure); };
  }, [children]);
  return <nav aria-label={title} className={[styles.root, className].filter(Boolean).join(" ")}><header className={styles.header}><h2>{title}</h2>{actions}</header><div ref={bodyRef} className={styles.body}><span className={styles.selection} aria-hidden="true" />{children}</div>{footer && <footer className={styles.footer}>{footer}</footer>}</nav>;
}
export function SidebarItem({ active, icon, count, children, className, render, ...props }: ComponentProps<"a"> & { active?: boolean; icon?: ReactNode; count?: number | undefined; render?: ReactElement }) {
  const content = <>{icon}<span className={styles.label}>{children}</span>{count !== undefined && <span className={styles.count}>{count}</span>}</>;
  const linkProps = { ...props, className: [styles.item, className].filter(Boolean).join(" "), "aria-current": active ? "page" as const : undefined, children: content };
  if (render) return cloneElement(render as ReactElement<ComponentProps<"a">>, linkProps);
  // Item que age em vez de navegar (ex.: «Buscar conversas» abre a busca do
  // painel): mesma cara dos outros itens, mas é um botão — o app não escreve
  // <button> nativo (CLAUDE.md, regra 2), então ele nasce aqui.
  if (!props.href && props.onClick) return <button type="button" {...(linkProps as unknown as ComponentProps<"button">)} />;
  return <a {...linkProps} />;
}
export function SidebarSection({ title, icon, children, collapsible = false, defaultOpen = false }: { title: string; icon?: ReactNode; children: ReactNode; collapsible?: boolean; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const contentId = useId();
  useEffect(() => { if (defaultOpen) setOpen(true); }, [defaultOpen]);
  return <section className={styles.section} data-collapsible={collapsible || undefined} data-icon={icon ? "true" : undefined}>
    {collapsible
      ? <button type="button" className={styles.sectionToggle} aria-expanded={open} aria-controls={contentId} onClick={() => setOpen((value) => !value)}>{icon && <span className={styles.sectionIcon}>{icon}</span>}<span className={styles.sectionTitle}>{title}</span><Icon name="right" /></button>
      : <h3>{icon && <span className={styles.sectionIcon}>{icon}</span>}{title}</h3>}
    {collapsible ? <div id={contentId} className={styles.sectionItems} data-open={open || undefined} aria-hidden={!open} inert={!open}><div className={styles.sectionItemsInner}>{children}</div></div> : children}
  </section>;
}
export function NavigationRail({ children, label = "Módulos", className, ...props }: ComponentProps<"nav"> & { children: ReactNode; label?: string; className?: string | undefined }) {
  return <nav {...props} className={[styles.rail, className].filter(Boolean).join(" ")} aria-label={label}>{children}</nav>;
}
