import { useMemo, useState } from "react";
import { Combobox } from "@base-ui/react/combobox";
import { lightTheme } from "@spark/tokens/native-theme";
import { Icon } from "../Icon/Icon.js";
import { OptionContent } from "../Select/OptionContent.js";
import type { SelectOption } from "../Select/Select.js";
import s from "./RecordSelect.module.css";

const RESULT_LIMIT = 6;

export interface RecordSelectProps {
  label: string;
  options: readonly SelectOption[];
  value: SelectOption | null;
  onValueChange: (value: SelectOption | null) => void;
  onCancel?: () => void;
  placeholder?: string;
  kind?: "person" | "company";
  disabled?: boolean;
  loading?: boolean;
  /** Estado vazio apresentado como opção; apagar a busca sozinho nunca remove o vínculo. */
  emptyOptionLabel?: string;
}

/** Busca local limitada: a seleção é o registro; o texto digitado é só uma busca. */
export function RecordSelect(props: RecordSelectProps) {
  return <RecordSelectInput key={props.value?.value ?? "unselected"} {...props} />;
}

function RecordSelectInput({ label, options, value, onValueChange, onCancel, placeholder = "Digite para buscar…", kind = "person", disabled = false, loading = false, emptyOptionLabel }: RecordSelectProps) {
  const [query, setQuery] = useState(value?.label ?? "");
  const [open, setOpen] = useState(false);
  const { contains } = Combobox.useFilter({ locale: "pt-BR", sensitivity: "base" });
  const matches = useMemo(() => {
    const terms = query.trim().split(/\s+/).filter(Boolean);
    const found: SelectOption[] = [];
    for (const option of options) {
      const text = `${option.label} ${option.description ?? ""}`;
      if (terms.every((term) => contains(text, term))) found.push(option);
      // One extra match is enough to tell the user to refine; never render the whole collection.
      if (found.length > RESULT_LIMIT) break;
    }
    return found;
  }, [options, query, contains]);
  const visible = matches.slice(0, RESULT_LIMIT);
  const hasMore = matches.length > RESULT_LIMIT;

  return <Combobox.Root<SelectOption>
    items={visible}
    filter={null}
    value={value}
    inputValue={query}
    open={open}
    disabled={disabled}
    autoHighlight
    itemToStringLabel={(item) => item.label}
    itemToStringValue={(item) => item.value}
    isItemEqualToValue={(item, selected) => item.value === selected.value}
    onInputValueChange={setQuery}
    onOpenChange={(next, details) => {
      setOpen(next);
      if (!next) {
        setQuery(value?.label ?? "");
        // The popup consumes Escape, so explicitly finish the inline edit too.
        if (details.reason === "escape-key") onCancel?.();
      }
    }}
    onValueChange={(next) => { if (next) onValueChange(next); }}
  >
    <Combobox.InputGroup className={s.field}>
      <span className={s.icon}><Icon name={kind === "company" ? "building" : "search"} /></span>
      <Combobox.Input
        className={s.input}
        aria-label={label}
        aria-busy={loading}
        placeholder={placeholder}
        onFocus={(event) => { setOpen(true); event.currentTarget.select(); }}
        onKeyDown={(event) => {
          // Enter belongs to the combobox, not InlineField's blur-to-save handler.
          if (event.key === "Enter") event.stopPropagation();
        }}
      />
    </Combobox.InputGroup>
    <Combobox.Portal>
      <Combobox.Positioner align="start" sideOffset={Number.parseFloat(lightTheme["space-1"])} className={s.positioner}>
        <Combobox.Popup className={s.popup} data-inline-editor>
          <Combobox.List className={s.list}>
            {(item: SelectOption) => <Combobox.Item key={item.value} value={item} disabled={loading || (item.disabled ?? false)} className={s.option}>
              <OptionContent option={{ ...item, avatar: item.avatar ?? null }} />
              <Combobox.ItemIndicator className={s.selected}><Icon name="check" /></Combobox.ItemIndicator>
            </Combobox.Item>}
          </Combobox.List>
          <Combobox.Empty className={s.empty}>{loading ? "Carregando…" : kind === "company" ? "Nenhuma empresa encontrada." : "Nenhuma pessoa encontrada."}</Combobox.Empty>
          {hasMore && <div className={s.more}>Continue digitando para ver outros resultados.</div>}
          {value && emptyOptionLabel && <button type="button" className={s.emptyOption} disabled={disabled || loading} onClick={() => { onValueChange(null); setOpen(false); }}><Icon name="close" />{emptyOptionLabel}</button>}
        </Combobox.Popup>
      </Combobox.Positioner>
    </Combobox.Portal>
  </Combobox.Root>;
}
