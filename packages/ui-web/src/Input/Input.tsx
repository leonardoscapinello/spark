import { Input as BaseInput } from "@base-ui/react/input";
import type { ComponentPropsWithoutRef } from "react";
import styles from "./Input.module.css";

export type InputSize = "sm" | "md" | "lg";

export type InputProps = {
  size?: InputSize;
} & Omit<ComponentPropsWithoutRef<typeof BaseInput>, "size">;
// Omit "size" porque <input> nativo já tem size?: number (largura em
// caracteres) — sem isso a interseção com nosso size visual vira `never`.

/**
 * Campo de texto. Usado sozinho ou (o caso comum) dentro de <Field>, onde o
 * id, aria-describedby e aria-invalid são conectados automaticamente pelo
 * contexto do Base UI — Input É Field.Control por baixo.
 */
export function Input({ size = "md", className, ...rest }: InputProps) {
  const cls = [styles.root, size !== "md" && styles[size], className].filter(Boolean).join(" ");
  return <BaseInput className={cls} {...rest} />;
}
