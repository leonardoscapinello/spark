import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";
import styles from "./Glass.module.css";

/**
 * O único primitivo autorizado a usar backdrop-filter (docs/adr/0025).
 * Use para sidebar, topbar, command palette, sheet, modal, menu, toast —
 * nunca para conteúdo que rola (tabela, lista, card de negócio).
 */
export type GlassProps<T extends ElementType = "div"> = {
  /** Elemento HTML a renderizar. Default: div. */
  as?: T;
  children?: ReactNode;
  className?: string;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "children" | "className">;

export function Glass<T extends ElementType = "div">({
  as,
  className,
  children,
  ...rest
}: GlassProps<T>) {
  const Component = as ?? "div";
  const cls = className ? `${styles.root} ${className}` : styles.root;
  return (
    <Component className={cls} {...rest}>
      {children}
    </Component>
  );
}
