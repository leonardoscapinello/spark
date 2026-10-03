import { cloneElement, useEffect, useId, useLayoutEffect, useRef, useState, type ComponentProps, type ReactElement, type ReactNode } from "react";
import { Icon } from "../Icon/Icon.js";
import { SearchField, type SearchFieldProps } from "../SearchField/SearchField.js";
import { useSlidingIndicator } from "../motion/useSlidingIndicator.js";
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
/** Sidebar compacta (trilho de módulos). `expanded` mostra os rótulos dos itens. */
export function NavigationRail({ children, label = "Módulos", expanded = false, className, ...props }: ComponentProps<"nav"> & { children: ReactNode; label?: string; expanded?: boolean; className?: string | undefined }) {
  return <nav {...props} data-rail="" data-expanded={expanded || undefined} className={[styles.rail, className].filter(Boolean).join(" ")} aria-label={label}>{children}</nav>;
}

/**
 * Grupo de itens do trilho com a folha do item ativo deslizando até ele em
 * 550 ms (a mesma física da seleção da sidebar). `selection` muda quando o
 * item ativo muda. `divided` põe o fio que separa o grupo no trilho de celular.
 */
export function RailGroup({ selection, divided = false, children, className, ref, ...props }: ComponentProps<"div"> & { selection: string; divided?: boolean }) {
  const own = useRef<HTMLDivElement | null>(null);
  useSlidingIndicator(own, selection);
  return <div
    {...props}
    ref={(node) => { own.current = node; if (typeof ref === "function") ref(node); else if (ref) ref.current = node; }}
    data-slide=""
    data-divided={divided || undefined}
    className={[styles.railGroup, className].filter(Boolean).join(" ")}
  >
    <span data-ind="" aria-hidden="true" className={styles.railIndicator} />
    {children}
  </div>;
}

/**
 * Marca no alto do trilho: símbolo sempre; nome por extenso só com o trilho
 * aberto. `render` é o link do roteador; sem ele, a marca é só imagem.
 */
export function RailBrand({ symbol, wordmark, label, render, className }: { symbol: string; wordmark?: string | undefined; label: string; render?: ReactElement | undefined; className?: string | undefined }) {
  const content = <><img className={styles.railBrandSymbol} src={symbol} alt="" />{wordmark && <img className={styles.railBrandWordmark} src={wordmark} alt="" />}</>;
  const props = { className: [styles.railBrand, className].filter(Boolean).join(" "), "aria-label": label, children: content };
  if (render) return cloneElement(render as ReactElement<ComponentProps<"a">>, props);
  return <span role="img" {...props} />;
}

/**
 * Item do trilho — um componente só para todo item: módulo (link), ação
 * (botão) ou gatilho de menu (perfil). Ícone num encaixe fixo e rótulo
 * alinhado à esquerda; recolhido, só o ícone num círculo de 44; aberto, linha
 * de 36 com rótulo. `data-on` alimenta a folha deslizante da lista.
 */
export function RailItem({ icon, label, active, pending, render, className, ...props }: Omit<ComponentProps<"a">, "children"> & { icon: ReactNode; label: string; active?: boolean; pending?: boolean; render?: ReactElement }) {
  const itemProps = {
    ...props,
    "aria-label": props["aria-label"] ?? label,
    "aria-current": active ? "page" as const : undefined,
    "data-pending": pending || undefined,
    "data-on": String(Boolean(active || pending)),
    className: [styles.railItem, className].filter(Boolean).join(" "),
    children: <><span className={styles.railItemIcon} aria-hidden="true">{icon}</span><span className={styles.railItemLabel}>{label}</span></>,
  };
  if (render) return cloneElement(render as ReactElement<ComponentProps<"a">>, itemProps);
  if (!props.href) return <button type="button" {...(itemProps as unknown as ComponentProps<"button">)} />;
  return <a {...itemProps} />;
}

/**
 * Busca da área no topo da sidebar: um campo de verdade (SearchField), não um
 * item que abre outra coisa. `shortcut` liga a tecla (ex.: "/", como num
 * cliente de e-mail) e a mostra no campo; a tecla não age enquanto se digita
 * em outro campo.
 */
export function SidebarSearch({ shortcut, ...props }: SearchFieldProps) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!shortcut) return;
    const focus = (event: KeyboardEvent) => {
      if (event.key !== shortcut || event.metaKey || event.ctrlKey || event.altKey) return;
      if ((event.target as HTMLElement | null)?.closest("input, textarea, select, [contenteditable=\"true\"]")) return;
      const input = root.current?.querySelector("input");
      if (!input) return;
      event.preventDefault();
      input.focus();
    };
    window.addEventListener("keydown", focus);
    return () => window.removeEventListener("keydown", focus);
  }, [shortcut]);
  return <div ref={root} className={styles.search} role="search"><SearchField {...props} {...(shortcut ? { shortcut } : {})} /></div>;
}
