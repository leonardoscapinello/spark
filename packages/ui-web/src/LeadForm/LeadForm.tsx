import type { FormEvent } from "react";
import type { LeadFormField } from "@spark/core";
import { Button } from "../Button/Button.js";
import { Field } from "../Field/Field.js";
import { Input } from "../Input/Input.js";
import { Label } from "../Label/Label.js";
import { Select } from "../Select/Select.js";
import { Switch } from "../Switch/Switch.js";
import { Textarea } from "../Textarea/Textarea.js";
import styles from "./LeadForm.module.css";
export interface LeadFormRendererProps { title: string; description?: string | null; fields: readonly LeadFormField[]; submitLabel: string; values: Record<string, string | boolean>; onValueChange: (id: string, value: string | boolean) => void; onSubmit: () => void | Promise<void>; submitting?: boolean; disabled?: boolean; successMessage?: string | null }
export function LeadFormRenderer({ title, description, fields, submitLabel, values, onValueChange, onSubmit, submitting, disabled, successMessage }: LeadFormRendererProps) {
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit();
  }
  if (successMessage) return <div className={styles.success}><strong>Enviado</strong><p>{successMessage}</p></div>;
  return <form className={styles.root} onSubmit={(event) => void submit(event)}>
    <header><h1>{title}</h1>{description && <p>{description}</p>}</header>
    <div className={styles.fields}>{fields.map((item) => <Field key={item.id}>
      {item.type === "checkbox" ? <Switch checked={values[item.id] === true} required={item.required} disabled={disabled} onCheckedChange={(checked) => onValueChange(item.id, checked)}>{item.label}{item.required ? " *" : ""}</Switch> : <>
        <Label>{item.label}{item.required ? " *" : ""}</Label>
        {item.type === "textarea" ? <Textarea value={string(values[item.id])} required={item.required} disabled={disabled} rows={4} onChange={(event) => onValueChange(item.id, event.target.value)} />
          : item.type === "select" ? <Select label={item.label} value={string(values[item.id]) || null} placeholder="Selecionar" disabled={disabled} options={item.options.map((option) => ({ value: option, label: option }))} onValueChange={(value) => onValueChange(item.id, value ?? "")} />
          : <Input type={item.type === "email" ? "email" : item.type === "phone" ? "tel" : "text"} value={string(values[item.id])} required={item.required} disabled={disabled} onChange={(event) => onValueChange(item.id, event.target.value)} />}
      </>}
    </Field>)}</div>
    <Button type="submit" loading={Boolean(submitting)} disabled={Boolean(disabled)}>{submitLabel}</Button>
  </form>;
}
function string(value: string | boolean | undefined): string { return typeof value === "string" ? value : ""; }
