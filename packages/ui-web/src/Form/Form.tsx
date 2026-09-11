import { Form as BaseForm } from "@base-ui/react/form";
import { Field as BaseField } from "@base-ui/react/field";
import type { ComponentProps } from "react";
import styles from "./Form.module.css";
export function Form({ className, ...props }: ComponentProps<typeof BaseForm>) {
  return <BaseForm className={typeof className === "string" ? `${styles.root} ${className}` : styles.root} {...props} />;
}
export function FieldDescription(props: ComponentProps<typeof BaseField.Description>) {
  return <BaseField.Description className={styles.description} {...props} />;
}
export function FormActions({ className, ...props }: ComponentProps<"div">) {
  return <div className={[styles.actions, className].filter(Boolean).join(" ")} {...props} />;
}
