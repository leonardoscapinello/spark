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
  /** Mantém a hierarquia tipográfica quando o editor ocupa um título de página. */
  appearance?: "default" | "title";
}
/** Apresentação e rascunho locais; validação e persistência ficam no consumidor. */
export function InlineEdit({ label, value, onSave, options, placeholder = "Não informado", disabled = false, errorText = "Não foi possível salvar. Tente novamente.", saveOnBlur = false, appearance = "default" }: InlineEditProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const busy = useRef(false);
  const restoreFocus = useRef(false);
  const errorId = useId();
  function close() { restoreFocus.current = true; setEditing(false); }
  async function save() {
    if (busy.current) return;
    if (draft === value) { close(); return; }
    busy.current = true; setPending(true); setError(false);
    try { await onSave(draft); close(); }
    catch { setError(true); }
    finally { busy.current = false; setPending(false); }
  }
  if (!editing) return <button type="button" className={s.value} data-appearance={appearance} disabled={disabled} aria-label={`Editar ${label}: ${options?.find(o=>o.value===value)?.label || value || placeholder}`} ref={node=>{if(node && restoreFocus.current){restoreFocus.current=false;node.focus();}}} onClick={()=>{setDraft(value);setError(false);setEditing(true);}}>{options?.find(o=>o.value===value)?.label || value || placeholder}</button>;
  return <div className={s.editor} data-appearance={appearance} role="group" aria-label={`Editar ${label}`} aria-busy={pending} onBlur={event=>{if(!saveOnBlur || busy.current)return;const next=event.relatedTarget;if(next instanceof Node && event.currentTarget.contains(next))return;void save();}} onKeyDown={event=>{if(event.defaultPrevented || busy.current)return;if(event.key === "Escape"){event.preventDefault();close();}else if(event.key === "Enter" && !options && !event.nativeEvent.isComposing){event.preventDefault();void save();}}}>
    <div className={s.control}>{options ? <Select label={label} options={options} value={draft} onValueChange={next=>{if(next!==null)setDraft(next);}} disabled={pending} defaultOpen /> : <Input aria-label={label} value={draft} onChange={event=>setDraft(event.target.value)} autoFocus disabled={pending} aria-invalid={error} aria-describedby={error ? errorId : undefined} />}</div>
    <div className={s.actions}><Button type="button" size="sm" shape="rounded" iconOnly icon={<Icon name="check" />} aria-label="Salvar" title="Salvar" loading={pending} onClick={()=>void save()} /><Button type="button" size="sm" shape="rounded" iconOnly icon={<Icon name="close" />} aria-label="Cancelar" title="Cancelar" variant="ghost" disabled={pending} onPointerDown={event=>event.preventDefault()} onClick={close} /></div>
    {error && <p id={errorId} role="alert" className={s.error}>{errorText}</p>}
  </div>;
}
