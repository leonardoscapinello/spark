import { Field as BaseField } from "@base-ui/react/field";
import type { ComponentPropsWithoutRef } from "react";
import styles from "./Field.module.css";

export type FieldProps = ComponentPropsWithoutRef<typeof BaseField.Root>;

/**
 * Agrupa Label + Input + ErrorText/descrição com id e aria conectados
 * automaticamente. Nunca escreva <label htmlFor> na mão — use isto.
 *
 * <Field invalid={!!erro}>
 *   <Label>Nome</Label>
 *   <Input />
 *   <ErrorText>{erro}</ErrorText>
 * </Field>
 */
export function Field({ className, ...rest }: FieldProps) {
  const cls = className ? `${styles.root} ${className}` : styles.root;
  return <BaseField.Root className={cls} {...rest} />;
}
