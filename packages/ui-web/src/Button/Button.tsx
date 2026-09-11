import { Button as BaseButton } from "@base-ui/react/button";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import styles from "./Button.module.css";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "raised";
export type ButtonSize = "sm" | "md" | "lg";

export type ButtonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Estado de carregamento — desabilita o botão e mostra um spinner, sem trocar o texto de lugar. */
  loading?: boolean;
  icon?: ReactNode;
  trailingIcon?: ReactNode;
  shape?: "pill" | "rounded";
  iconOnly?: boolean;
  children?: ReactNode;
} & Omit<ComponentPropsWithoutRef<typeof BaseButton>, "children">;

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  trailingIcon,
  shape = "pill",
  iconOnly = false,
  disabled,
  children,
  className,
  ...rest
}: ButtonProps) {
  const cls = [styles.root, styles[variant], styles[size], styles[shape], iconOnly && styles.iconOnly, className].filter(Boolean).join(" ");
  return (
    <BaseButton aria-busy={loading || undefined} className={cls} disabled={disabled || loading} {...rest}>
      {loading && <span className={styles.spinner} aria-hidden="true" />}
      {!loading && icon && <span className={styles.icon} aria-hidden="true">{icon}</span>}
      {children}
      {trailingIcon && <span className={styles.icon} aria-hidden="true">{trailingIcon}</span>}
    </BaseButton>
  );
}
