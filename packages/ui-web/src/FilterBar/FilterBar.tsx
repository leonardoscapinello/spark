import { useState } from "react";
import { filterOperatorLabel, filterOperatorNeedsValue, operatorsForFilterType, type FilterOperator, type FilterValueType } from "@spark/core";
import { Button } from "../Button/Button.js";
import { Icon } from "../Icon/Icon.js";
import { Input } from "../Input/Input.js";
import { Popover, PopoverContent, PopoverTrigger } from "../Popover/Popover.js";
import { Select } from "../Select/Select.js";
import s from "./FilterBar.module.css";

export interface FilterFieldDefinition<Field extends string = string> {
  id: Field;
  label: string;
  type: FilterValueType;
  group?: string;
  options?: readonly { value: string; label: string }[];
}

export interface FilterCondition<Field extends string = string> { field: Field; operator: FilterOperator; value: string | null }

export interface FilterBarProps<Field extends string = string> {
  fields: readonly FilterFieldDefinition<Field>[];
  filters: readonly FilterCondition<Field>[];
  onChange: (filters: FilterCondition<Field>[]) => void;
  addLabel?: string;
}

function describe(field: FilterFieldDefinition<string>, condition: FilterCondition<string>): string {
  const operator = filterOperatorLabel(condition.operator);
  if (!filterOperatorNeedsValue(condition.operator)) return `${field.label} ${operator}`;
  const shown = field.options?.find((option) => option.value === condition.value)?.label ?? condition.value;
  return shown ? `${field.label} ${operator} ${shown}` : `${field.label} ${operator}…`;
}

/** Filtros compostos: cada condição é uma etiqueta editável, e «Adicionar
 * filtro» abre o catálogo de campos. O estado é do consumidor — a barra não
 * decide o que filtrar nem onde a escolha é guardada. */
export function FilterBar<Field extends string = string>({ fields, filters, onChange, addLabel = "Adicionar filtro" }: FilterBarProps<Field>) {
  const [query, setQuery] = useState("");
  const search = query.trim().toLocaleLowerCase("pt-BR");
  const available = search ? fields.filter((field) => `${field.label} ${field.group ?? ""}`.toLocaleLowerCase("pt-BR").includes(search)) : fields;

  function replace(index: number, condition: FilterCondition<Field>) {
    onChange(filters.map((existing, position) => position === index ? condition : existing));
  }

  return <div className={s.root} role="group" aria-label="Filtros aplicados">
    {filters.map((condition, index) => {
      const field = fields.find((item) => item.id === condition.field);
      if (!field) return null;
      return <span key={`${condition.field}-${index}`} className={s.chip}>
        <Popover>
          <PopoverTrigger render={<Button size="sm" variant="ghost" className={s.chipLabel}>{describe(field, condition)}</Button>} />
          <PopoverContent title={field.label}>
            <div className={s.editor}>
              <Select
                label={`Operador de ${field.label}`}
                value={condition.operator}
                options={operatorsForFilterType(field.type).map((operator) => ({ value: operator, label: filterOperatorLabel(operator) }))}
                onValueChange={(operator) => { if (operator) replace(index, { ...condition, operator: operator as FilterOperator, value: filterOperatorNeedsValue(operator as FilterOperator) ? condition.value : null }); }}
              />
              {filterOperatorNeedsValue(condition.operator) && (field.options
                ? <Select label={`Valor de ${field.label}`} value={condition.value} placeholder="Selecionar" options={field.options.map((option) => ({ value: option.value, label: option.label }))} onValueChange={(value) => replace(index, { ...condition, value: value ?? null })} />
                : <Input aria-label={`Valor de ${field.label}`} type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"} value={condition.value ?? ""} onChange={(event) => replace(index, { ...condition, value: event.target.value || null })} />)}
            </div>
          </PopoverContent>
        </Popover>
        <Button size="sm" variant="ghost" shape="rounded" iconOnly aria-label={`Remover filtro ${field.label}`} icon={<Icon name="close" />} onClick={() => onChange(filters.filter((_, position) => position !== index))} />
      </span>;
    })}
    <Popover>
      <PopoverTrigger render={<Button size="sm" variant="ghost" icon={<Icon name="plus" />}>{addLabel}</Button>} />
      <PopoverContent title={addLabel}>
        <Input autoFocus aria-label="Pesquisar campo" value={query} startAdornment={<Icon name="search" />} placeholder="Pesquisar campo" onChange={(event) => setQuery(event.target.value)} />
        <div className={s.fieldList}>
          {available.length === 0 ? <p className={s.empty}>Nenhum campo encontrado.</p> : available.map((field, index) => <div key={field.id}>
            {field.group && available[index - 1]?.group !== field.group && <p className={s.group}>{field.group}</p>}
            <Button variant="ghost" shape="rounded" className={s.fieldOption} onClick={() => { setQuery(""); onChange([...filters, { field: field.id, operator: operatorsForFilterType(field.type)[0]!, value: null }]); }}>{field.label}</Button>
          </div>)}
        </div>
      </PopoverContent>
    </Popover>
  </div>;
}
