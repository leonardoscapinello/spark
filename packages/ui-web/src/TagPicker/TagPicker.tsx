import { Glass } from "../Glass/Glass.js";
import surface from "../shared/surfaces.module.css";
import { useMemo, useState, type CSSProperties } from "react";
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
}

export function TagPicker({ label, options, value, onValueChange, onCreate, placeholder = "Adicionar etiquetas", disabled = false }: TagPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");
  const filtered = useMemo(() => normalizedQuery ? options.filter((option) => option.label.toLocaleLowerCase("pt-BR").includes(normalizedQuery)) : options, [normalizedQuery, options]);
  const canCreate = Boolean(onCreate && query.trim() && !options.some((option) => option.label.toLocaleLowerCase("pt-BR") === normalizedQuery));

  const suggestions = filtered.filter((option) => !value.includes(option.value)).slice(0, 12);
  /* Caixa cavada com os chips dentro (origem: Seleção §19, "Multi-select com
   * chips"): cada etiqueta é uma folha de 28 com o ponto da cor e o × de 26; a
   * busca continua na mesma linha. */
  return <div className={styles.root} data-disabled={disabled || undefined}>
    {value.map((id) => {
      const option = options.find((item) => item.value === id);
      return <span key={id} className={styles.chip} style={{ "--tag-dot": crmColor(option?.color) } as CSSProperties}>
        <span className={styles.dot} aria-hidden="true" />
        <span className={styles.chipLabel}>{option?.label ?? id}</span>
        {!disabled && <button type="button" className={styles.remove} aria-label={"Remover etiqueta " + (option?.label ?? id)} onClick={() => onValueChange(value.filter((item) => item !== id))}><Icon name="close" /></button>}
      </span>;
    })}
    {!disabled && <Combobox.Root<TagPickerOption> items={suggestions} filter={null} value={null} inputValue={query} onInputValueChange={setQuery} open={open} onOpenChange={setOpen} autoHighlight itemToStringLabel={(item) => item.label} onValueChange={(option) => { if (option) { onValueChange([...value, option.value]); setQuery(""); } }}>
      <Combobox.Input className={styles.input} aria-label={label} placeholder={value.length ? "Adicionar…" : "Buscar ou criar etiqueta…"} onFocus={() => setOpen(true)} />
      <Combobox.Portal><Combobox.Positioner className={styles.positioner} sideOffset={Number.parseFloat(lightTheme["pop-gap"])} align="start">
        <Combobox.Popup render={<Glass tier="panel" />} className={`${surface.popup} ${styles.popup}`}>
          <Combobox.List className={styles.options}>{(option: TagPickerOption) => <Combobox.Item key={option.value} value={option} className={surface.item}>
            <span className={surface.leading} aria-hidden="true"><span className={styles.swatch} style={{ "--tag-dot": crmColor(option.color) } as CSSProperties} /></span><span className={surface.label}>{option.label}</span>
          </Combobox.Item>}</Combobox.List>
          {!suggestions.length && !canCreate && <span className={styles.empty}>Nenhuma outra etiqueta encontrada.</span>}
          {filtered.length > 12 && <span className={styles.empty}>Continue digitando para refinar a busca.</span>}
          {canCreate && <button type="button" className={surface.item} onClick={() => { void onCreate?.(query.trim()); setQuery(""); }}><span className={surface.leading} aria-hidden="true"><Icon name="plus" /></span><span className={surface.label}>Criar “{query.trim()}”</span></button>}
        </Combobox.Popup>
      </Combobox.Positioner></Combobox.Portal>
    </Combobox.Root>}
    {disabled && !value.length && <span className={styles.placeholder}>{placeholder}</span>}
  </div>;
}
