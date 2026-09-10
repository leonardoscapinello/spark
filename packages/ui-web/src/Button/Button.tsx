import { Button as BaseButton } from "@base-ui/react/button";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import styles from "./Button.module.css";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

export type ButtonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Estado de carregamento — desabilita o botão e mostra um spinner, sem trocar o texto de lugar. */
  loading?: boolean;
  children?: ReactNode;
} & Omit<ComponentPropsWithoutRef<typeof BaseButton>, "children">;

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  children,
  className,
  ...rest
}: ButtonProps) {
  const cls = [styles.root, styles[variant], styles[size], className].filter(Boolean).join(" ");
  return (
    <BaseButton className={cls} disabled={disabled || loading} {...rest}>
      {loading && <span className={styles.spinner} aria-hidden="true" />}
      {children}
    </BaseButton>
  );
}
