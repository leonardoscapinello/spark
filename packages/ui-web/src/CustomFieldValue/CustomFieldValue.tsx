import { useEffect, useState, type ReactNode } from "react";
import { customFieldOptions, normalizeCustomFieldValue, type CustomFieldDefinition } from "@spark/core";
import { Button } from "../Button/Button.js";
import { Checkbox } from "../Checkbox/Checkbox.js";
import { DatePicker, DateTimePicker } from "../DateTimePicker/DateTimePicker.js";
import { Input } from "../Input/Input.js";
import { MaskedInput } from "../MaskedInput/MaskedInput.js";
import { Select } from "../Select/Select.js";
import { Textarea } from "../Textarea/Textarea.js";
import s from "./CustomFieldValue.module.css";

export interface CustomFieldValueProps {
  field: CustomFieldDefinition;
  value: unknown;
  disabled?: boolean;
  /** Recebe o valor já normalizado pelo core; lançar aqui volta como erro na tela. */
  onSave: (value: unknown) => Promise<void>;
  /** Como avisar a pessoa — a tela decide (toast, inline). */
  onError?: (message: string) => void;
  onSuccess?: (label: string) => void;
}

/**
 * Um campo personalizado editável, do tipo que a organização definiu
 * (packages/core/schema/customField: texto, texto longo, número, moeda, data,
 * data e hora, telefone, endereço web, sim/não e seleções).
 *
 * O controle certo para cada tipo — calendário para data, máscara para
 * telefone, caixa para sim/não — em vez de uma caixa de texto para tudo. A
 * validação é a do core, a mesma da API: o que a tela recusa, o servidor
 * recusaria igual (ADR-0019).
 *
 * Os que salvam sozinhos (seleção, data, sim/não) gravam na escolha; os de
 * digitar mostram «Salvar», porque gravar a cada tecla mandaria valor pela
 * metade.
 */
export function CustomFieldValue({ field, value, disabled = false, onSave, onError, onSuccess }: CustomFieldValueProps) {
  const [draft, setDraft] = useState(() => toDraft(field, value));
  const [saving, setSaving] = useState(false);
  // Valor que chegou pela sincronização (outro dispositivo, outra pessoa) substitui
  // o rascunho — menos enquanto esta pessoa está gravando o dela.
  useEffect(() => { if (!saving) setDraft(toDraft(field, value)); }, [field, value, saving]);

  async function save(raw: unknown) {
    setSaving(true);
    try {
      await onSave(normalizeCustomFieldValue(field, raw));
      onSuccess?.(field.label);
    } catch (cause) {
      onError?.(cause instanceof Error ? cause.message : "Revise o campo.");
      setDraft(toDraft(field, value));
    } finally {
      setSaving(false);
    }
  }

  const busy = disabled || saving;
  const row = (control: ReactNode) => <div className={s.row}><span className={s.label}>{field.label}{field.required && <span className={s.required} aria-label="obrigatório">*</span>}</span><div className={s.control}>{control}</div></div>;

  if (field.type === "boolean") return row(<Checkbox checked={value === true} disabled={busy} onCheckedChange={(checked) => void save(checked === true)}>{value === true ? "Sim" : "Não"}</Checkbox>);
  if (field.type === "single_select") return row(<Select label={field.label} value={typeof value === "string" ? value : null} placeholder="Selecionar" options={customFieldOptions(field).map((option) => ({ value: option, label: option }))} disabled={busy} onValueChange={(next) => void save(next)} />);
  if (field.type === "multi_select") return row(<Select<true> multiple label={field.label} value={Array.isArray(value) ? value.map(String) : []} placeholder="Selecionar" options={customFieldOptions(field).map((option) => ({ value: option, label: option }))} disabled={busy} onValueChange={(next) => void save(next)} />);
  if (field.type === "date") return row(<DatePicker label={field.label} value={draft} disabled={busy} onValueChange={(next) => { setDraft(next); void save(next); }} />);
  if (field.type === "datetime") return row(<DateTimePicker mode="datetime" label={field.label} value={draft} disabled={busy} onValueChange={(next) => { setDraft(next); void save(next); }} />);
  if (field.type === "paragraph") return row(<div className={s.editor}><Textarea aria-label={field.label} value={draft} disabled={busy} placeholder="Sem valor" onChange={(event) => setDraft(event.target.value)} /><SaveButton saving={saving} disabled={disabled} onClick={() => void save(draft)} /></div>);
  if (field.type === "phone") return row(<div className={s.editor}><MaskedInput format="(##) #####-####" aria-label={field.label} value={draft} disabled={busy} placeholder="(11) 90000-0000" onValueChange={setDraft} /><SaveButton saving={saving} disabled={disabled} onClick={() => void save(draft)} /></div>);

  const inputType = field.type === "number" ? "number" : field.type === "url" ? "url" : "text";
  const placeholder = field.type === "currency" ? "0,00" : field.type === "url" ? "acme.com.br" : "Sem valor";
  return row(<div className={s.editor}>
    <Input type={inputType} inputMode={field.type === "currency" ? "decimal" : undefined} aria-label={field.label} value={draft} disabled={busy} placeholder={placeholder} onChange={(event) => setDraft(event.target.value)} />
    <SaveButton saving={saving} disabled={disabled} onClick={() => void save(draft)} />
  </div>);
}

function SaveButton({ saving, disabled, onClick }: { saving: boolean; disabled: boolean; onClick: () => void }) {
  return <Button size="sm" variant="secondary" loading={saving} disabled={disabled} onClick={onClick}>Salvar</Button>;
}

/** Valor guardado → texto do controle. Moeda é centavo no banco e reais na tela. */
function toDraft(field: CustomFieldDefinition, value: unknown): string {
  if (value === null || value === undefined) return "";
  if (field.type === "currency") return typeof value === "number" ? (value / 100).toFixed(2).replace(".", ",") : String(value);
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}
