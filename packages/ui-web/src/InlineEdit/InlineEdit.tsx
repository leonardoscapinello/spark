import { useId, useRef, useState } from "react";
import { Button } from "../Button/Button.js";
import { Icon } from "../Icon/Icon.js";
import { Input } from "../Input/Input.js";
import { Select, type SelectOption } from "../Select/Select.js";
import s from "./InlineEdit.module.css";
export interface InlineEditProps {
  label: string;
  value: string;
  onSave: (value: string) => void | Promise<void>;
  options?: readonly SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  errorText?: string;
  /** Salva quando o foco deixa o editor, como os campos da ficha do CRM. */
  saveOnBlur?: boolean;
  /** Mostra o valor inteiro, quebrando linhas dentro da largura disponível. */
  wrap?: boolean;
  /** title: título de página (44, herda a tipografia) · compact: rótulo de cabeçalho (28, herda a tipografia). */
  appearance?: "default" | "title" | "compact";
}
/**
 * Texto solto que vira campo no lugar (título do negócio, nome da etapa). Segue
 * o contrato do InlineField: a MESMA caixa parada e editando — tinta com lápis
 * no hover, papel cavado com borda --tx3 e halo ao editar. O título mantém a
 * tipografia de quem o envolve; Salvar e Cancelar moram dentro da caixa.
 * Apresentação e rascunho locais; validação e persistência ficam no consumidor.
 */
export function InlineEdit({ label, value, onSave, options, placeholder = "Não informado", disabled = false, errorText = "Não foi possível salvar. Tente novamente.", saveOnBlur = false, wrap = false, appearance = "default" }: InlineEditProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const busy = useRef(false);
  const restoreFocus = useRef(false);
  const errorId = useId();
  const shown = options?.find((option) => option.value === value)?.label || value || placeholder;
  function close() { restoreFocus.current = true; setEditing(false); }
  async function save() {
    if (busy.current) return;
    if (draft === value) { close(); return; }
    busy.current = true; setPending(true); setError(false);
    try { await onSave(draft); close(); }
    catch { setError(true); }
    finally { busy.current = false; setPending(false); }
  }
  return <div className={s.root} data-appearance={appearance} data-wrap={wrap || undefined}>
    {!editing
      ? <div className={s.box} data-state="display" data-disabled={disabled || undefined}>
          <button type="button" className={s.value} data-empty={!value || undefined} disabled={disabled} aria-label={`Editar ${label}: ${shown}`} ref={(node) => { if (node && restoreFocus.current) { restoreFocus.current = false; node.focus(); } }} onClick={() => { setDraft(value); setError(false); setEditing(true); }}>
            <span className={s.text}>{shown}</span>
            {!disabled && <span className={s.mark} aria-hidden="true"><Icon name="pencil" /></span>}
          </button>
        </div>
      : <div className={s.box} data-state="editing" data-error={error || undefined} role="group" aria-label={`Editar ${label}`} aria-busy={pending} onBlur={(event) => { if (!saveOnBlur || busy.current) return; const next = event.relatedTarget; if (next instanceof Node && event.currentTarget.contains(next)) return; void save(); }} onKeyDown={(event) => { if (event.defaultPrevented || busy.current) return; if (event.key === "Escape") { event.preventDefault(); close(); } else if (event.key === "Enter" && !options && !event.nativeEvent.isComposing) { event.preventDefault(); void save(); } }}>
          <div className={s.editor}>{options
            ? <Select label={label} options={options} value={draft} onValueChange={(next) => { if (next !== null) setDraft(next); }} disabled={pending} defaultOpen />
            : <Input aria-label={label} value={draft} onChange={(event) => setDraft(event.target.value)} autoFocus disabled={pending} aria-invalid={error} aria-describedby={error ? errorId : undefined} />}</div>
          <Button type="button" size="sm" variant="ghost" iconOnly icon={<Icon name="check" />} aria-label="Salvar" title="Salvar" loading={pending} onClick={() => void save()} />
          <Button type="button" size="sm" variant="ghost" iconOnly icon={<Icon name="close" />} aria-label="Cancelar" title="Cancelar" disabled={pending} onPointerDown={(event) => event.preventDefault()} onClick={close} />
        </div>}
    {editing && error && <div className={s.errorSlot}><p id={errorId} role="alert" className={s.error}>{errorText}</p></div>}
  </div>;
}
