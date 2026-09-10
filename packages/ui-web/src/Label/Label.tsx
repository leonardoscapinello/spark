import { Field as BaseField } from "@base-ui/react/field";
import type { ComponentPropsWithoutRef } from "react";
import styles from "./Label.module.css";

export type LabelProps = ComponentPropsWithoutRef<typeof BaseField.Label>;

/** Precisa estar dentro de <Field> — é o que conecta o htmlFor automaticamente. */
export function Label({ className, ...rest }: LabelProps) {
  const cls = className ? `${styles.root} ${className}` : styles.root;
  return <BaseField.Label className={cls} {...rest} />;
}
