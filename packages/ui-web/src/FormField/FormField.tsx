import type { ReactNode } from "react";
import { Field, type FieldProps } from "../Field/Field.js";
import { Label } from "../Label/Label.js";
import { FieldDescription } from "../Form/Form.js";
import { ErrorText } from "../ErrorText/ErrorText.js";
import s from "./FormField.module.css";
export type FormFieldLayout = "vertical" | "horizontal" | "hidden-label";
export type FormFieldProps = Omit<FieldProps,"children"> & {
  label: string;
  layout?: FormFieldLayout;
  description?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
};
/** Composição pronta de label, controle, ajuda e erro. Um controle por campo. */
export function FormField({label,layout="vertical",description,error,children,className,invalid,...props}:FormFieldProps){
  return <Field {...props} invalid={invalid ?? !!error} className={[s.root,s[layout],className].filter(Boolean).join(" ")}>
    <Label className={layout==="hidden-label"?s.hidden:s.label}>{label}</Label>
    <div className={s.control}>{children}{description && <FieldDescription>{description}</FieldDescription>}{error && <ErrorText>{error}</ErrorText>}</div>
  </Field>;
}
