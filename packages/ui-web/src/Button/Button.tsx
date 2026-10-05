import { Button as BaseButton } from "@base-ui/react/button";
import { useRef, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { useLabelMorph } from "../motion/useLabelMorph.js";
import { Spinner } from "../Spinner/Spinner.js";
import styles from "./Button.module.css";
import { startMarquee, stopMarquee } from "../motion/marquee.js";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "raised" | "row" | "link";
export type ButtonSize = "sm" | "md" | "lg";

export type ButtonProps = {
  /** primary = carvão (um por área) · secondary/raised = folha · ghost = tinta · row = linha de lista · link = texto sublinhado. */
  variant?: ButtonVariant | undefined;
  size?: ButtonSize | undefined;
  /** danger = shu (destrutivo); success = estado positivo. */
  tone?: "neutral" | "success" | "danger" | undefined;
  /** Carregando — o rótulo fica e o ensō entra no lugar do ícone; desabilita o clique. */
  loading?: boolean | undefined;
  icon?: ReactNode;
  trailingIcon?: ReactNode;
  /** @deprecated Controles são sempre pílula (ADR-0044). Mantido para compatibilidade. */
  shape?: "pill" | "rounded" | undefined;
  iconOnly?: boolean | undefined;
  children?: ReactNode;
} & Omit<ComponentPropsWithoutRef<typeof BaseButton>, "children">;

const PRESS: Record<ButtonVariant, "ink" | "sheet" | "ghost"> = {
  primary: "ink",
  secondary: "sheet",
  raised: "sheet",
  ghost: "ghost",
  row: "ghost",
  link: "ghost",
};

function isText(node: ReactNode): boolean {
  if (typeof node === "string" || typeof node === "number") return true;
  return Array.isArray(node) && node.length > 0 && node.every(item => typeof item === "string" || typeof item === "number");
}

export function Button({
  variant = "primary",
  size = "md",
  tone = "neutral",
  loading = false,
  icon,
  trailingIcon,
  shape: _shape,
  iconOnly = false,
  disabled,
  children,
  className,
  onMouseEnter,
  onMouseLeave,
  ...rest
}: ButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const text = isText(children);
  /* Rótulo que muda, forma que escoa: Salvar → Salvando… morfa a largura. */
  useLabelMorph(ref, text ? String(Array.isArray(children) ? children.join("") : children) : null);
  const leading = !iconOnly && (loading || Boolean(icon));
  const cls = [
    styles.root,
    styles[variant],
    styles[size],
    iconOnly && styles.iconOnly,
    leading && styles.leading,
    !iconOnly && trailingIcon && styles.trailing,
    className,
  ].filter(Boolean).join(" ");
  return (
    <BaseButton
      ref={ref}
      data-press={PRESS[variant]}
      data-tone={tone === "neutral" ? undefined : tone}
      aria-busy={loading || undefined}
      className={cls}
      disabled={disabled || loading}
      onMouseEnter={event => { startMarquee(event); onMouseEnter?.(event); }}
      onMouseLeave={event => { stopMarquee(event); onMouseLeave?.(event); }}
      {...rest}
    >
      {loading && <span className={styles.icon} aria-hidden="true"><Spinner size="sm" /></span>}
      {!loading && icon && <span className={styles.icon} aria-hidden="true">{icon}</span>}
      {text ? <span data-lbl=""><span>{children}</span></span> : children}
      {trailingIcon && <span className={styles.icon} aria-hidden="true">{trailingIcon}</span>}
    </BaseButton>
  );
}
