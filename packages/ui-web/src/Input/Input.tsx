import { Input as BaseInput } from "@base-ui/react/input";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { inkTyping } from "../motion/inkTyping.js";
import styles from "./Input.module.css";

export type InputSize = "sm" | "md" | "lg";

export type InputProps = {
  /** md 40 (padrão) · sm 36 (compacto) · lg 44. */
  size?: InputSize;
  startAdornment?: ReactNode;
  endAdornment?: ReactNode;
  /** Valor numérico em mono tabular (moeda, porcentagem, documento). */
  numeric?: boolean;
} & Omit<ComponentPropsWithoutRef<typeof BaseInput>, "size">;
// Omit "size" porque <input> nativo já tem size?: number (largura em
// caracteres) — sem isso a interseção com nosso size visual vira `never`.

/**
 * Campo de texto. Usado sozinho ou (o caso comum) dentro de <Field>, onde o
 * id, aria-describedby e aria-invalid são conectados automaticamente pelo
 * contexto do Base UI — Input É Field.Control por baixo.
 *
 * Ao digitar, a caixa respira e cada letra surge da tinta (inkTyping).
 */
export function Input({ size = "md", className, startAdornment, endAdornment, numeric = false, onInput, ...rest }: InputProps) {
  const cls = [styles.root, size !== "md" && styles[size], numeric && styles.numeric, className].filter(Boolean).join(" ");
  const input = <BaseInput className={cls} onInput={(event) => { inkTyping(event.nativeEvent as InputEvent); onInput?.(event); }} {...rest} />;
  if (startAdornment === undefined && endAdornment === undefined) return input;
  return <div className={[styles.adorned, size !== "md" && styles[size]].filter(Boolean).join(" ")} data-disabled={rest.disabled || undefined}>
    {startAdornment !== undefined && <span className={styles.adornment}>{startAdornment}</span>}
    {input}
    {endAdornment !== undefined && <span className={styles.adornment}>{endAdornment}</span>}
  </div>;
}
