import { cloneElement, useEffect, useRef, type ComponentProps, type ReactElement } from "react";
import { useSlidingIndicator } from "../motion/useSlidingIndicator.js";
import s from "./LinkTabs.module.css";

export interface LinkTab { key: string; label: string; active?: boolean; pending?: boolean; render?: ReactElement; href?: string }

/**
 * Abas que são links (navegação entre telas da mesma área). Mesmo desenho das
 * abas sublinhadas do `Tabs`: rótulo 500 13 em tinta 3, ativo em tinta 1, e o
 * traço de 2px desliza até a aba ativa em 550 ms. `placement="sheet"` é a
 * barra de abas da área no topo da folha de conteúdo: fica presa no alto ao
 * rolar, com o papel da folha e o fio embaixo.
 */
export function LinkTabs({ label, items, className, placement = "inline" }: { label: string; items: readonly LinkTab[]; className?: string | undefined; placement?: "inline" | "sheet" | undefined }) {
  const root = useRef<HTMLElement>(null);
  const activeKey = items.find(item => item.pending)?.key ?? items.find(item => item.active)?.key ?? "";
  useSlidingIndicator(root, activeKey);
  /* Muitas abas numa largura estreita rolam de lado; a ativa nunca fica escondida. */
  useEffect(() => {
    const nav = root.current;
    const active = nav?.querySelector<HTMLElement>(':scope > [data-on="true"]');
    if (nav && active && nav.scrollWidth > nav.clientWidth) active.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [activeKey]);
  return <nav ref={root} data-slide="" data-placement={placement} aria-label={label} className={[s.root, className].filter(Boolean).join(" ")}>
    <span data-ind="line" aria-hidden="true" className={s.indicator} />
    {items.map(item => {
      const props = { key: item.key, className: s.tab, "data-on": String(item.key === activeKey), "aria-current": item.active ? "page" as const : undefined, "data-pending": item.pending || undefined, children: item.label };
      return item.render ? cloneElement(item.render as ReactElement<ComponentProps<"a">>, props) : <a href={item.href} {...props} />;
    })}
  </nav>;
}
