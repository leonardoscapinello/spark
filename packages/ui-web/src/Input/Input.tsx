import { Input as BaseInput } from "@base-ui/react/input";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import styles from "./Input.module.css";

export type InputSize = "sm" | "md" | "lg";

export type InputProps = {
  size?: InputSize;
  startAdornment?: ReactNode;
  endAdornment?: ReactNode;
} & Omit<ComponentPropsWithoutRef<typeof BaseInput>, "size">;
// Omit "size" porque <input> nativo já tem size?: number (largura em
// caracteres) — sem isso a interseção com nosso size visual vira `never`.

/**
 * Campo de texto. Usado sozinho ou (o caso comum) dentro de <Field>, onde o
 * id, aria-describedby e aria-invalid são conectados automaticamente pelo
 * contexto do Base UI — Input É Field.Control por baixo.
 */
export function Input({ size = "md", className, startAdornment, endAdornment, ...rest }: InputProps) {
  const cls = [styles.root, size !== "md" && styles[size], className].filter(Boolean).join(" ");
  const input = <BaseInput className={cls} {...rest} />;
  if (startAdornment === undefined && endAdornment === undefined) return input;
  return <div className={styles.adorned} data-disabled={rest.disabled || undefined}>
    {startAdornment !== undefined && <span className={styles.adornment}>{startAdornment}</span>}
    {input}
    {endAdornment !== undefined && <span className={styles.adornment}>{endAdornment}</span>}
  </div>;
}
