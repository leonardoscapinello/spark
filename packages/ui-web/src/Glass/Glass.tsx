import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";
import styles from "./Glass.module.css";

export type GlassTier = "subtle" | "panel" | "modal";

/**
 * The only primitive authorized to use backdrop-filter (docs/adr/0025,
 * docs/adr/0031). `tier` picks blur, radius, and elevation together —
 * "subtle" for a chip/tag/glass-button, "panel" for a card, dropdown,
 * drawer, sidebar or topbar, "modal" for a modal or confirmation. Never
 * use this on a scrolling table row or list item, and never stack more
 * than a few glass surfaces on screen at once — recomputing
 * backdrop-filter for many simultaneous elements is the real performance
 * risk, not the property by itself.
 */
export type GlassProps<T extends ElementType = "div"> = {
  /** HTML element to render. Default: div. */
  as?: T;
  /** Default: "panel". */
  tier?: GlassTier;
  children?: ReactNode;
  className?: string;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "children" | "className" | "tier">;

export function Glass<T extends ElementType = "div">({
  as,
  tier = "panel",
  className,
  children,
  ...rest
}: GlassProps<T>) {
  const Component = as ?? "div";
  const cls = [styles.root, styles[tier], className].filter(Boolean).join(" ");
  return (
    <Component className={cls} {...rest}>
      {children}
    </Component>
  );
}
