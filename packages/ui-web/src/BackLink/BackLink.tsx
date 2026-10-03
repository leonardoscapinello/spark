import { cloneElement, type ComponentProps, type ReactElement, type ReactNode } from "react";
import { Icon } from "../Icon/Icon.js";
import styles from "./BackLink.module.css";

export type BackLinkProps = Omit<ComponentProps<"a">, "children"> & {
  children: ReactNode;
  render?: ReactElement;
};

/** Voltar (origem: Padrões, "Voltar"): tinta 2, 500 12, pílula de 30 com chevron de 14; o hover pinta de --acs. */
export function BackLink({ children, render, className, ...props }: BackLinkProps) {
  const linkProps = {
    ...props,
    "data-press": "ghost",
    className: [styles.root, className].filter(Boolean).join(" "),
    children: <><Icon name="chevronLeft" className={styles.arrow} /><span>{children}</span></>,
  };
  return render ? cloneElement(render as ReactElement<ComponentProps<"a">>, linkProps) : <a {...linkProps} />;
}
