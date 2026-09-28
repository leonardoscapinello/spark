import { useMemo, useState } from "react";
import { Button } from "../Button/Button.js";
import { Icon } from "../Icon/Icon.js";
import { Input } from "../Input/Input.js";
import { Popover, PopoverContent, PopoverTrigger } from "../Popover/Popover.js";
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
  onCreate?: (name: string) => void | Promise<void>;
  placeholder?: string;
  disabled?: boolean;
}

export function TagPicker({ label, options, value, onValueChange, onCreate, placeholder = "Adicionar etiquetas", disabled = false }: TagPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");
  const filtered = useMemo(() => normalizedQuery ? options.filter((option) => option.label.toLocaleLowerCase("pt-BR").includes(normalizedQuery)) : options, [normalizedQuery, options]);
  const canCreate = Boolean(onCreate && query.trim() && !options.some((option) => option.label.toLocaleLowerCase("pt-BR") === normalizedQuery));

  function toggle(option: TagPickerOption) {
    onValueChange(value.includes(option.value) ? value.filter((item) => item !== option.value) : [...value, option.value]);
  }

  return <Popover open={open} onOpenChange={(next) => { setOpen(next); if (!next) setQuery(""); }}>
    <PopoverTrigger render={<Button type="button" variant="secondary" disabled={disabled} className={styles.trigger} aria-label={label}>{value.length ? `${value.length} ${value.length === 1 ? "etiqueta" : "etiquetas"}` : placeholder}<Icon name="chevron" /></Button>} />
    <PopoverContent title={label} className={styles.popup} {...(styles.content ? { contentClassName: styles.content } : {})}>
      <Input type="search" autoFocus aria-label={`Pesquisar ${label.toLocaleLowerCase("pt-BR")}`} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Digite para buscar ou criar" startAdornment={<Icon name="search" />} />
      <div className={styles.options} role="listbox" aria-label={label}>
        {filtered.map((option) => <Button key={option.value} type="button" variant="ghost" className={styles.option} aria-selected={value.includes(option.value)} onClick={() => toggle(option)}>
          <span className={styles.swatch} style={{ background: option.color?.startsWith("#") ? option.color : semanticColorTokens[option.color ?? "neutral"] ?? "var(--color-accent)" }} />
          <span>{option.label}</span>
          {value.includes(option.value) && <Icon name="check" />}
        </Button>)}
        {filtered.length === 0 && !canCreate && <span className={styles.empty}>Nenhuma etiqueta encontrada.</span>}
        {canCreate && <Button type="button" variant="secondary" className={styles.create} icon={<Icon name="plus" />} onClick={() => { void onCreate?.(query.trim()); setQuery(""); }}>
          Criar “{query.trim()}”
        </Button>}
      </div>
    </PopoverContent>
  </Popover>;
}
