import { Glass } from "../Glass/Glass.js";
import surface from "../shared/surfaces.module.css";
import { useState, type CSSProperties } from "react";
import { Icon } from "../Icon/Icon.js";
import { Combobox } from "@base-ui/react/combobox";
import { crmColor } from "../CrmWorkspace/CrmWorkspace.js";
import { lightTheme } from "@spark/tokens/native-theme";
import styles from "./TagPicker.module.css";

export interface TagPickerOption {
  value: string;
  label: string;
  color?: string;
}

export interface TagPickerProps {
  label: string;
  options: readonly TagPickerOption[];
  value: readonly string[];
  onValueChange: (value: string[]) => void;
  onCreate?: ((name: string) => void | Promise<void>) | undefined;
  placeholder?: string;
  disabled?: boolean;
  /** Na ficha, exibe só etiquetas e o botão de adicionar; busca fica no menu. */
  appearance?: "field" | "inline";
  onManage?: (() => void) | undefined;
}

export function TagPicker({ label, options, value, onValueChange, onCreate, placeholder = "Adicionar etiquetas", disabled = false, appearance = "field", onManage }: TagPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inline = appearance === "inline";
  const selected = value.map(id => options.find(option => option.value === id) ?? { value: id, label: id });
  const choices = inline ? [...selected, ...options.filter(option => !value.includes(option.value))] : options.filter(option => !value.includes(option.value));
  const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");
  const filtered = choices.filter(option => option.label.toLocaleLowerCase("pt-BR").includes(normalizedQuery));
  const suggestions = filtered.slice(0, 50);
  const canCreate = Boolean(!disabled && onCreate && query.trim() && !options.some(option => option.label.toLocaleLowerCase("pt-BR") === normalizedQuery));
  const shown = inline ? selected.slice(0, 2) : selected;
  const hiddenCount = selected.length - shown.length;

  return <div className={styles.root} data-appearance={appearance} data-disabled={disabled || undefined} role="group" aria-label={label}>
    <div className={styles.selection}>
      {shown.map(option => <span key={option.value} className={styles.chip} title={option.label} style={{ "--tag-dot": crmColor(option.color) } as CSSProperties}>
        {!inline && <span className={styles.dot} aria-hidden="true" />}
        <span className={styles.chipLabel}>{option.label}</span>
        {!disabled && <button type="button" className={styles.remove} aria-label={"Remover etiqueta " + option.label} onClick={() => onValueChange(value.filter(item => item !== option.value))}><Icon name="close" /></button>}
      </span>)}
    </div>
    {(!disabled || hiddenCount > 0) && <Combobox.Root<TagPickerOption, true> multiple items={suggestions} filter={null} value={selected} isItemEqualToValue={(a, b) => a.value === b.value} inputValue={query} onInputValueChange={setQuery} open={open} onOpenChange={(next) => { setOpen(next); if (!next) setQuery(""); }} autoHighlight itemToStringLabel={item => item.label} onValueChange={next => { if (!disabled) { onValueChange(next.map(option => option.value)); if (!inline) setQuery(""); } }}>
      {inline
        ? <Combobox.Trigger className={styles.add} aria-label={disabled ? "Ver todas as etiquetas" : "Editar etiquetas"} title={hiddenCount ? `Ver todas as ${value.length} etiquetas` : "Adicionar etiquetas"}>{hiddenCount > 0 ? `+${hiddenCount}` : <Icon name="plus" />}{value.length === 0 && "Adicionar etiqueta"}</Combobox.Trigger>
        : <Combobox.Input className={styles.input} aria-label={label} placeholder={value.length ? "Adicionar…" : "Buscar ou criar etiqueta…"} onFocus={() => setOpen(true)} />}
      <Combobox.Portal><Combobox.Positioner className={styles.positioner} sideOffset={Number.parseFloat(lightTheme["pop-gap"])} align="start">
        <Combobox.Popup render={<Glass tier="panel" />} className={`${surface.popup} ${styles.popup}`} aria-label={label}>
          {inline && <div className={styles.search}><Icon name="search" /><Combobox.Input className={styles.searchInput} aria-label="Buscar etiquetas" placeholder="Buscar etiquetas…" /></div>}
          <Combobox.List className={styles.options}>{(option: TagPickerOption) => <Combobox.Item key={option.value} value={option} disabled={disabled} className={surface.item}>
            <span className={surface.leading} aria-hidden="true"><span className={styles.swatch} style={{ "--tag-dot": crmColor(option.color) } as CSSProperties} /></span><span className={surface.label}>{option.label}</span><Combobox.ItemIndicator className={surface.indicator}><Icon name="check" /></Combobox.ItemIndicator>
          </Combobox.Item>}</Combobox.List>
          {!suggestions.length && !canCreate && <span className={styles.empty}>Nenhuma etiqueta encontrada.</span>}
          {filtered.length > suggestions.length && <span className={styles.empty}>Continue digitando para refinar a busca.</span>}
          {canCreate && <button type="button" className={`${surface.item} ${styles.menuAction}`} onClick={() => { void onCreate?.(query.trim()); setQuery(""); }}><span className={surface.leading} aria-hidden="true"><Icon name="plus" /></span><span className={surface.label}>Criar “{query.trim()}”</span></button>}
          {!disabled && onManage && <><div className={surface.separator} /><button type="button" className={`${surface.item} ${styles.menuAction}`} onClick={() => { setOpen(false); setQuery(""); onManage(); }}><span className={surface.leading} aria-hidden="true"><Icon name="settings" /></span><span className={surface.label}>Gerenciar etiquetas</span></button></>}
        </Combobox.Popup>
      </Combobox.Positioner></Combobox.Portal>
    </Combobox.Root>}
    {disabled && !value.length && <span className={styles.placeholder}>{placeholder}</span>}
  </div>;
}
