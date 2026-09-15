import { useEffect, useRef, useState, type ReactNode } from "react";
import { customFieldOptions, formatCustomFieldValue, money, normalizeCustomFieldValue, type CustomFieldDefinition } from "@spark/core";
import { Checkbox } from "../Checkbox/Checkbox.js";
import { DatePicker, DateTimePicker } from "../DateTimePicker/DateTimePicker.js";
import { Input } from "../Input/Input.js";
import { MaskedInput, MoneyInput } from "../MaskedInput/MaskedInput.js";
import { Select } from "../Select/Select.js";
import { Textarea } from "../Textarea/Textarea.js";
import { InlineField } from "../InlineField/InlineField.js";
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
  preview?: ReactNode;
  onPreviewRequest?: () => void;
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
 * Gravar é otimista: o valor exibido muda na hora e a confirmação vem depois,
 * pela sincronização. Esperar a volta deixava o campo num limbo — a linha
 * mostrando o valor antigo, o editor já com o novo, e nada dizendo o que estava
 * acontecendo. Se a gravação falhar, o valor volta ao que era e o erro aparece.
 */
export function CustomFieldValue({ field, value, options, disabled = false, onSave, onError, onSuccess, preview, onPreviewRequest }: CustomFieldValueProps) {
  const choices = options ?? customFieldOptions(field);
  /* O valor que a tela mostra. Começa igual ao sincronizado e passa a ser o
   * que esta pessoa gravou, na hora — a volta do servidor demora, e mostrar o
   * antigo enquanto isso é o que criava o limbo. */
  const [local, setLocal] = useState<unknown>(value);
  const [draft, setDraft] = useState(() => toDraft(field, value));
  const [saving, setSaving] = useState(false);
  const gravado = useRef<unknown>(value);

  /* Valor vindo de fora (outro dispositivo, outra pessoa) assume.
   *
   * A dependência é o ID do campo, NÃO o objeto `field`: ele é recriado a cada
   * render do painel, e com ele na lista o efeito rodava sempre — apagando a
   * data recém-escolhida antes de a gravação voltar. */
  useEffect(() => {
    if (saving) return;
    if (Object.is(value, gravado.current)) return;
    gravado.current = value;
    setLocal(value);
    setDraft(toDraft(field, value));
  }, [field.id, field.type, value, saving]);

  async function save(raw: unknown) {
    setSaving(true);
    try {
      const normalized = normalizeCustomFieldValue(field, raw, choices);
      gravado.current = normalized;
      setLocal(normalized);
      setDraft(toDraft(field, normalized));
      await onSave(normalized);
      onSuccess?.(field.label);
    } catch (cause) {
      onError?.(cause instanceof Error ? cause.message : "Revise o campo.");
      gravado.current = value;
      setLocal(value);
      setDraft(toDraft(field, value));
    } finally {
      setSaving(false);
    }
  }

  /* NÃO desabilita enquanto grava: a escrita é local primeiro e a ida ao
   * servidor entra numa fila, então travar o campo só faz parecer quebrado. */
  const busy = disabled;
  const shown = formatCustomFieldValue(field, local);
  /* Endereço web se lê como link: um clique edita, dois abrem (InlineField). */
  const href = field.type === "url" && shown !== "" ? shown : undefined;

  /* Parado é texto; clicou, vira campo. O mesmo comportamento das linhas do
   * resumo, porque quem usa não distingue «campo do sistema» de «campo que a
   * organização criou» — e não deveria mesmo. */
  const row = (control: (close: () => void) => ReactNode) => <InlineField
    label={field.label}
    required={field.required}
    block={field.type === "paragraph"}
    value={shown === "" ? "Clique para adicionar" : shown}
    empty={shown === ""}
    disabled={disabled}
    {...(href === undefined ? {} : { href })}
    {...(href === undefined || preview === undefined ? {} : { preview, onPreviewRequest })}
  >{control}</InlineField>;

  if (field.type === "boolean") return row((close) => <Checkbox checked={local === true} disabled={busy} onCheckedChange={(checked) => { close(); void save(checked === true); }}>{local === true ? "Sim" : "Não"}</Checkbox>);
  if (field.type === "single_select") return row((close) => <Select label={field.label} value={typeof local === "string" ? local : null} placeholder="Selecionar" options={choices.map((option) => ({ value: option, label: option }))} disabled={busy} onValueChange={(next) => { close(); void save(next); }} />);
  if (field.type === "multi_select") return row(() => <Select<true> multiple label={field.label} value={Array.isArray(local) ? local.map(String) : []} placeholder="Selecionar" options={choices.map((option) => ({ value: option, label: option }))} disabled={busy} onValueChange={(next) => void save(next)} />);
  if (field.type === "date") return row((close) => <DatePicker label={field.label} value={draft} disabled={busy} onValueChange={(next) => { close(); setDraft(next); void save(next); }} />);
  if (field.type === "datetime") return row((close) => <DateTimePicker mode="datetime" label={field.label} value={draft} disabled={busy} onValueChange={(next) => { close(); setDraft(next); void save(next); }} />);
  if (field.type === "paragraph") return row((close) => <Textarea rows={3} className={s.area} aria-label={field.label} value={draft} disabled={busy} placeholder="Sem valor" onChange={(event) => setDraft(event.target.value)} onBlur={() => { close(); if (draft !== toDraft(field, local)) void save(draft); }} />);
  if (field.type === "phone") return row((close) => <MaskedInput format="(##) #####-####" aria-label={field.label} value={draft} disabled={busy} placeholder="(11) 90000-0000" onValueChange={setDraft} onBlur={() => { close(); if (draft !== toDraft(field, local)) void save(draft); }} />);

  // Dinheiro tem campo próprio: R$, separador de milhar e duas casas, e o valor
  // já sai em centavos — nenhum campo de texto acerta isso sozinho.
  if (field.type === "currency") {
    /* Grava ao SAIR do campo, não a cada tecla. Gravando por tecla, digitar
     * «7» virava R$ 0,07 no mesmo instante, a gravação voltava e reescrevia o
     * campo, e os centavos nunca chegavam a ser digitados. */
    /* `money()` recusa o que não for centavo inteiro, e recusa lançando. Num
     * caminho de render isso derruba a tela inteira — foi o «Invalid monetary
     * value: NaN». O rascunho é texto: ele é conferido ANTES de virar Money. */
    const centavos = Number(draft);
    const digitado = draft === "" || !Number.isInteger(centavos) ? null : money(centavos);
    return row((close) => <MoneyInput
      label={field.label}
      value={digitado}
      disabled={busy}
      onValueChange={(next) => setDraft(next === null ? "" : String(next))}
      onBlur={() => { close(); if (draft !== toDraft(field, local)) void save(digitado); }}
    />);
  }

  const inputType = field.type === "number" ? "number" : field.type === "url" ? "url" : "text";
  const placeholder = field.type === "url" ? "acme.com.br" : "Sem valor";
  // Grava ao sair do campo, como no Pipedrive. Um botão «Salvar» por linha
  // roubava metade da largura do painel e pedia um clique a mais em cada
  // campo — e o painel tem muitos.
  return row((close) => <Input type={inputType} aria-label={field.label} value={draft} disabled={busy} placeholder={placeholder} onChange={(event) => setDraft(event.target.value)} onBlur={() => { close(); if (draft !== toDraft(field, local)) void save(draft); }} />);
}


/** Valor guardado → texto do controle. Moeda fica em centavo: é a unidade
 * que o `MoneyInput` recebe e devolve, e a que o banco guarda. */
function toDraft(field: CustomFieldDefinition, value: unknown): string {
  if (value === null || value === undefined) return "";
  if (field.type === "currency") return typeof value === "number" ? String(value) : "";
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}
