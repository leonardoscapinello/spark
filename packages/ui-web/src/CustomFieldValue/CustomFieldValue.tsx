import { useEffect, useRef, useState, type ReactNode } from "react";
import { customFieldOptions, formatCustomFieldValue, money, normalizeCustomFieldValue, toCents, type CustomFieldDefinition } from "@spark/core";
import { Checkbox } from "../Checkbox/Checkbox.js";
import { DatePicker, DateTimePicker } from "../DateTimePicker/DateTimePicker.js";
import { Input } from "../Input/Input.js";
import { DocumentInput, MaskedInput, MoneyInput } from "../MaskedInput/MaskedInput.js";
import { Select } from "../Select/Select.js";
import { Textarea } from "../Textarea/Textarea.js";
import { InlineField } from "../InlineField/InlineField.js";
import type { IconName } from "../Icon/Icon.js";
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
  /**
   * Botão irmão do valor, além de editar — o mesmo lugar por onde «Pessoa» e
   * «Empresa» abrem a ficha. É aqui que mora uma ação sobre o valor, e não
   * dentro da prévia: prévia é tooltip, e tooltip não recebe clique.
   */
  action?: { label: string; icon: IconName; onClick: () => void };
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
export function CustomFieldValue({ field, value, options, disabled = false, onSave, onError, onSuccess, preview, onPreviewRequest, action }: CustomFieldValueProps) {
  const choices = options ?? customFieldOptions(field);
  /* O valor que a tela mostra. Começa igual ao sincronizado e passa a ser o
   * que esta pessoa gravou, na hora — a volta do servidor demora, e mostrar o
   * antigo enquanto isso é o que criava o limbo. */
  const [local, setLocal] = useState<unknown>(value);
  const [draft, setDraft] = useState(() => toDraft(field, value));
  const observed = useRef<unknown>(value);
  const confirmed = useRef<unknown>(value);
  const revision = useRef(0);

  /* Valor vindo de fora (outro dispositivo, outra pessoa) assume.
   *
   * A dependência é o ID do campo, NÃO o objeto `field`: ele é recriado a cada
   * render do painel, e com ele na lista o efeito rodava sempre — apagando a
   * data recém-escolhida antes de a gravação voltar. */
  useEffect(() => {
    // Encerrar o spinner não é uma nova leitura: a prop pode continuar sendo
    // a versão anterior até o Electric entregar a confirmação. Só uma mudança
    // efetiva vinda da coleção pode substituir o valor que acabamos de salvar.
    if (sameValue(value, observed.current)) return;
    observed.current = value;
    confirmed.current = value;
    revision.current += 1;
    setLocal(value);
    setDraft(toDraft(field, value));
  }, [field.id, field.type, value]);

  async function save(raw: unknown) {
    const currentRevision = ++revision.current;
    try {
      const normalized = normalizeCustomFieldValue(field, raw, choices);
      setLocal(normalized);
      setDraft(toDraft(field, normalized));
      await onSave(normalized);
      if (revision.current === currentRevision) confirmed.current = normalized;
      onSuccess?.(field.label);
    } catch (cause) {
      onError?.(cause instanceof Error ? cause.message : "Revise o campo.");
      // Uma falha antiga não desfaz uma edição ou atualização mais recente.
      if (revision.current === currentRevision) {
        setLocal(confirmed.current);
        setDraft(toDraft(field, confirmed.current));
      }
      throw cause;
    }
  }

  /* NÃO desabilita enquanto grava: a escrita é local primeiro e a ida ao
   * servidor entra numa fila, então travar o campo só faz parecer quebrado. */
  const busy = disabled;
  const shown = formatCustomFieldValue(field, local);
  /* Endereço web se lê como link: um clique edita, dois abrem (InlineField). */
  const href = field.type === "url" && shown !== "" ? shown : undefined;

  function discardDraft() {
    setDraft(toDraft(field, local));
  }

  /* Parado é texto; clicou, vira campo. O mesmo comportamento das linhas do
   * resumo, porque quem usa não distingue «campo do sistema» de «campo que a
   * organização criou» — e não deveria mesmo. */
  const row = (control: (close: (persistence?: Promise<unknown>) => void, trackPersistence: (persistence: Promise<unknown>) => void) => ReactNode) => <InlineField
    label={field.label}
    required={field.required}
    block={field.type === "paragraph"}
    value={shown === "" ? "Clique para adicionar" : shown}
    empty={shown === ""}
    disabled={disabled}
    onCancel={discardDraft}
    {...(href === undefined ? {} : { href })}
    {...(action === undefined ? {} : { action })}
    /* A prévia não depende de haver endereço. A condição aqui exigia `href`,
     * que só existe em campo de endereço web — e com isso a prévia do CNPJ era
     * montada, passada para cá e descartada em silêncio. Prévia é prévia, venha
     * de um link ou de um documento. */
    {...(preview === undefined ? {} : { preview, ...(onPreviewRequest === undefined ? {} : { onPreviewRequest }) })}
  >{control}</InlineField>;

  if (field.type === "boolean") return row((close) => <Checkbox checked={local === true} disabled={busy} onCheckedChange={(checked) => close(save(checked === true))}>{local === true ? "Sim" : "Não"}</Checkbox>);
  if (field.type === "single_select") return row((close) => <Select label={field.label} value={typeof local === "string" ? local : null} placeholder="Selecionar" options={choices.map((option) => ({ value: option, label: option }))} disabled={busy} onValueChange={(next) => close(save(next))} />);
  if (field.type === "multi_select") return row((_close, trackPersistence) => <Select<true> multiple label={field.label} value={Array.isArray(local) ? local.map(String) : []} placeholder="Selecionar" options={choices.map((option) => ({ value: option, label: option }))} disabled={busy} onValueChange={(next) => trackPersistence(save(next))} />);
  if (field.type === "date") return row((close) => <DatePicker label={field.label} value={draft} disabled={busy} onValueChange={(next) => { setDraft(next); close(save(next)); }} />);
  if (field.type === "datetime") return row((close) => <DateTimePicker mode="datetime" label={field.label} value={draft} disabled={busy} onValueChange={(next) => { setDraft(next); close(save(next)); }} />);
  if (field.type === "paragraph") return row((close) => <Textarea rows={3} className={s.area} aria-label={field.label} value={draft} disabled={busy} placeholder="Sem valor" onChange={(event) => setDraft(event.target.value)} onBlur={() => close(draft !== toDraft(field, local) ? save(draft) : undefined)} />);
  if (field.type === "phone") return row((close) => <MaskedInput format="(##) #####-####" aria-label={field.label} value={draft} disabled={busy} placeholder="(11) 90000-0000" onValueChange={setDraft} onBlur={() => close(draft !== toDraft(field, local) ? save(draft) : undefined)} />);
  /* CPF e CNPJ no mesmo campo: a máscara troca sozinha ao passar de 11
   * dígitos. Pedir para escolher antes de digitar é uma decisão que o próprio
   * número já toma — e quem cadastra uma carteira mista não quer dois campos
   * para a mesma coluna. */
  if (field.type === "document") return row((close) => <DocumentInput label={field.label} value={draft} disabled={busy} onValueChange={setDraft} onBlur={() => close(draft !== toDraft(field, local) ? save(draft) : undefined)} />);

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
      onValueChange={(next) => setDraft(next === null ? "" : String(toCents(next)))}
      onBlur={() => close(draft !== toDraft(field, local) ? save(digitado === null ? null : toCents(digitado)) : undefined)}
    />);
  }

  const inputType = field.type === "number" ? "number" : field.type === "url" ? "url" : field.type === "email" ? "email" : "text";
  const placeholder = field.type === "url" ? "acme.com.br" : field.type === "email" ? "nome@empresa.com.br" : "Sem valor";
  // Grava ao sair do campo, como no Pipedrive. Um botão «Salvar» por linha
  // roubava metade da largura do painel e pedia um clique a mais em cada
  // campo — e o painel tem muitos.
  return row((close) => <Input type={inputType} aria-label={field.label} value={draft} disabled={busy} placeholder={placeholder} onChange={(event) => setDraft(event.target.value)} onBlur={() => close(draft !== toDraft(field, local) ? save(draft) : undefined)} />);
}

function sameValue(left: unknown, right: unknown): boolean {
  return Object.is(left, right) || (Array.isArray(left) && Array.isArray(right)
    && left.length === right.length && left.every((item, index) => Object.is(item, right[index])));
}

/** Valor guardado → texto do controle. Moeda fica em centavo: é a unidade
 * que o `MoneyInput` recebe e devolve, e a que o banco guarda. */
function toDraft(field: CustomFieldDefinition, value: unknown): string {
  if (value === null || value === undefined) return "";
  if (field.type === "currency") return typeof value === "number" ? String(value) : "";
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}
