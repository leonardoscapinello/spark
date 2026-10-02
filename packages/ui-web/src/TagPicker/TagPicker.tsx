import { Glass } from "../Glass/Glass.js";
import surface from "../shared/surfaces.module.css";
import { useMemo, useState } from "react";
import { Button } from "../Button/Button.js";
import { Icon } from "../Icon/Icon.js";
import { Combobox } from "@base-ui/react/combobox";
import { lightTheme } from "@spark/tokens/native-theme";
import styles from "./TagPicker.module.css";

const semanticColorTokens: Record<string, string> = {
  neutral: "var(--color-inkMuted)",
  blue: "var(--color-accent)",
  green: "var(--color-statusSuccess)",
  red: "var(--color-statusDanger)",
  amber: "var(--color-statusWarning)",
  purple: "var(--color-accentStrong)",
};

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
  return <div className={styles.root}>
    <div className={styles.chips}>
      {value.map((id) => {
        const option = options.find((item) => item.value === id);
        const color = option?.color;
        return <span key={id} className={styles.chip} style={{ color: color?.startsWith("#") ? color : semanticColorTokens[color ?? "neutral"] }}>
          {option?.label ?? id}
          {!disabled && <Button variant="ghost" size="sm" iconOnly aria-label={"Remover etiqueta " + (option?.label ?? id)} icon={<Icon name="close" />} onClick={() => onValueChange(value.filter((item) => item !== id))} />}
        </span>;
      })}
    </div>
    {!disabled && <Combobox.Root<TagPickerOption> items={suggestions} filter={null} value={null} inputValue={query} onInputValueChange={setQuery} open={open} onOpenChange={setOpen} autoHighlight itemToStringLabel={(item) => item.label} onValueChange={(option) => { if (option) { onValueChange([...value, option.value]); setQuery(""); } }}>
      <Combobox.Input className={styles.input} aria-label={label} placeholder="Buscar ou criar etiqueta…" onFocus={() => setOpen(true)} />
      <Combobox.Portal><Combobox.Positioner className={styles.positioner} sideOffset={Number.parseFloat(lightTheme["space-1"])} align="start">
        <Combobox.Popup render={<Glass tier="panel" />} className={`${surface.popup} ${styles.popup}`}>
          <Combobox.List className={styles.options}>{(option: TagPickerOption) => <Combobox.Item key={option.value} value={option} className={surface.item}>
            <span className={styles.swatch} style={{ background: option.color?.startsWith("#") ? option.color : semanticColorTokens[option.color ?? "neutral"] }} />{option.label}
          </Combobox.Item>}</Combobox.List>
          {!suggestions.length && !canCreate && <span className={styles.empty}>Nenhuma outra etiqueta encontrada.</span>}
          {filtered.length > 12 && <span className={styles.empty}>Continue digitando para refinar a busca.</span>}
          {canCreate && <Button variant="ghost" className={styles.create} icon={<Icon name="plus" />} onClick={() => { void onCreate?.(query.trim()); setQuery(""); }}>Criar “{query.trim()}”</Button>}
        </Combobox.Popup>
      </Combobox.Positioner></Combobox.Portal>
    </Combobox.Root>}
    {disabled && !value.length && <span className={styles.empty}>{placeholder}</span>}
  </div>;
}
