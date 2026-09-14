import { useEffect, useState, type ReactNode } from "react";
import { customFieldOptions, money, normalizeCustomFieldValue, type CustomFieldDefinition } from "@spark/core";
import { Checkbox } from "../Checkbox/Checkbox.js";
import { DatePicker, DateTimePicker } from "../DateTimePicker/DateTimePicker.js";
import { Input } from "../Input/Input.js";
import { MaskedInput, MoneyInput } from "../MaskedInput/MaskedInput.js";
import { Select } from "../Select/Select.js";
import { Textarea } from "../Textarea/Textarea.js";
import s from "./CustomFieldValue.module.css";

export interface CustomFieldValueProps {
  field: CustomFieldDefinition;
  value: unknown;
  /** As opções válidas, vindas de `custom_field_options` (ADR-0035). */
  options?: readonly string[];
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
export function CustomFieldValue({ field, value, options, disabled = false, onSave, onError, onSuccess }: CustomFieldValueProps) {
  const choices = options ?? customFieldOptions(field);
  const [draft, setDraft] = useState(() => toDraft(field, value));
  const [saving, setSaving] = useState(false);
  // Valor que chegou pela sincronização (outro dispositivo, outra pessoa) substitui
  // o rascunho — menos enquanto esta pessoa está gravando o dela.
  useEffect(() => { if (!saving) setDraft(toDraft(field, value)); }, [field, value, saving]);

  async function save(raw: unknown) {
    setSaving(true);
    try {
      await onSave(normalizeCustomFieldValue(field, raw, choices));
      onSuccess?.(field.label);
    } catch (cause) {
      onError?.(cause instanceof Error ? cause.message : "Revise o campo.");
      setDraft(toDraft(field, value));
    } finally {
      setSaving(false);
    }
  }

  const busy = disabled || saving;
  const row = (control: ReactNode) => <div className={s.field}><div className={s.row}><span className={s.label}>{field.label}{field.required && <span className={s.required} aria-label="obrigatório">*</span>}</span><div className={s.control}>{control}</div></div></div>;

  if (field.type === "boolean") return row(<Checkbox checked={value === true} disabled={busy} onCheckedChange={(checked) => void save(checked === true)}>{value === true ? "Sim" : "Não"}</Checkbox>);
  if (field.type === "single_select") return row(<Select label={field.label} value={typeof value === "string" ? value : null} placeholder="Selecionar" options={choices.map((option) => ({ value: option, label: option }))} disabled={busy} onValueChange={(next) => void save(next)} />);
  if (field.type === "multi_select") return row(<Select<true> multiple label={field.label} value={Array.isArray(value) ? value.map(String) : []} placeholder="Selecionar" options={choices.map((option) => ({ value: option, label: option }))} disabled={busy} onValueChange={(next) => void save(next)} />);
  if (field.type === "date") return row(<DatePicker label={field.label} value={draft} disabled={busy} onValueChange={(next) => { setDraft(next); void save(next); }} />);
  if (field.type === "datetime") return row(<DateTimePicker mode="datetime" label={field.label} value={draft} disabled={busy} onValueChange={(next) => { setDraft(next); void save(next); }} />);
  if (field.type === "paragraph") return row(<Textarea rows={3} className={s.area} aria-label={field.label} value={draft} disabled={busy} placeholder="Sem valor" onChange={(event) => setDraft(event.target.value)} onBlur={() => { if (draft !== toDraft(field, value)) void save(draft); }} />);
  if (field.type === "phone") return row(<MaskedInput format="(##) #####-####" aria-label={field.label} value={draft} disabled={busy} placeholder="(11) 90000-0000" onValueChange={setDraft} onBlur={() => { if (draft !== toDraft(field, value)) void save(draft); }} />);

  // Dinheiro tem campo próprio: R$, separador de milhar e duas casas, e o valor
  // já sai em centavos — nenhum campo de texto acerta isso sozinho.
  if (field.type === "currency") {
    const cents = typeof value === "number" ? money(value) : null;
    return row(<MoneyInput label={field.label} value={cents} disabled={busy} onValueChange={(next) => void save(next)} />);
  }

  const inputType = field.type === "number" ? "number" : field.type === "url" ? "url" : "text";
  const placeholder = field.type === "url" ? "acme.com.br" : "Sem valor";
  // Grava ao sair do campo, como no Pipedrive. Um botão «Salvar» por linha
  // roubava metade da largura do painel e pedia um clique a mais em cada
  // campo — e o painel tem muitos.
  return row(<Input type={inputType} aria-label={field.label} value={draft} disabled={busy} placeholder={placeholder} onChange={(event) => setDraft(event.target.value)} onBlur={() => { if (draft !== toDraft(field, value)) void save(draft); }} />);
}


/** Valor guardado → texto do controle. Moeda é centavo no banco e reais na tela. */
function toDraft(field: CustomFieldDefinition, value: unknown): string {
  if (value === null || value === undefined) return "";
  if (field.type === "currency") return typeof value === "number" ? (value / 100).toFixed(2).replace(".", ",") : String(value);
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}
