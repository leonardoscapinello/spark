import { cloneElement, type ComponentProps, type ReactElement, type ReactNode } from "react";
import { Icon } from "../Icon/Icon.js";
import styles from "./BackLink.module.css";

export type BackLinkProps = Omit<ComponentProps<"a">, "children"> & {
  children: ReactNode;
  render?: ReactElement;
};

export function BackLink({ children, render, className, ...props }: BackLinkProps) {
  const linkProps = {
    ...props,
    className: [styles.root, className].filter(Boolean).join(" "),
    children: <><Icon name="right" className={styles.arrow} /><span>{children}</span></>,
  };
  return render ? cloneElement(render as ReactElement<ComponentProps<"a">>, linkProps) : <a {...linkProps} />;
}
