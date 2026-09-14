import { useState } from "react";
import { filterOperatorAcceptsMany, filterOperatorLabel, filterOperatorNeedsValue, operatorsForFilterType, type FilterCombinator, type FilterOperator, type FilterValueType } from "@spark/core";
import { Button } from "../Button/Button.js";
import { DatePicker } from "../DateTimePicker/DateTimePicker.js";
import { Icon } from "../Icon/Icon.js";
import { Input } from "../Input/Input.js";
import { Popover, PopoverContent, PopoverTrigger } from "../Popover/Popover.js";
import { SegmentedControl } from "../SegmentedControl/SegmentedControl.js";
import { Select } from "../Select/Select.js";
import s from "./FilterBar.module.css";

export interface FilterFieldDefinition<Field extends string = string> {
  id: Field;
  label: string;
  type: FilterValueType;
  group?: string;
  options?: readonly { value: string; label: string }[];
}

export interface FilterCondition<Field extends string = string> { field: Field; operator: FilterOperator; value: string | string[] | null }
export interface FilterGroup<Field extends string = string> { combinator: FilterCombinator; conditions: FilterCondition<Field>[] }
export interface FilterSet<Field extends string = string> { combinator: FilterCombinator; groups: FilterGroup<Field>[] }

export interface FilterBarProps<Field extends string = string> {
  fields: readonly FilterFieldDefinition<Field>[];
  value: FilterSet<Field>;
  onChange: (next: FilterSet<Field>) => void;
  label?: string;
}

const COMBINATORS: readonly { value: FilterCombinator; label: string }[] = [{ value: "and", label: "Todas (E)" }, { value: "or", label: "Qualquer (OU)" }];
const GROUP_COMBINATORS: readonly { value: FilterCombinator; label: string }[] = [{ value: "and", label: "Todos os grupos (E)" }, { value: "or", label: "Qualquer grupo (OU)" }];

/** Ao trocar de operador, o valor acompanha a forma que ele pede: lista ou um só. */
function fitValue(operator: FilterOperator, value: FilterCondition["value"]): FilterCondition["value"] {
  if (!filterOperatorNeedsValue(operator)) return null;
  if (filterOperatorAcceptsMany(operator)) return Array.isArray(value) ? value : value ? [value] : null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function countConditions<Field extends string>(set: FilterSet<Field>): number {
  return set.groups.reduce((total, group) => total + group.conditions.length, 0);
}

/**
 * Filtro composto, como o do Pipedrive: uma pílula «Filtros · N» abre o
 * construtor — grupos de condições com E/OU dentro e entre eles, cada linha
 * campo · operador · valor, calendário para data e seleção múltipla para
 * lista. A barra da coleção nunca cresce: com um filtro ou vinte, é a mesma
 * pílula. O estado é do consumidor — o construtor não decide o que filtrar
 * nem onde a escolha é guardada.
 */
export function FilterBar<Field extends string = string>({ fields, value, onChange, label = "Filtros" }: FilterBarProps<Field>) {
  const [open, setOpen] = useState(false);
  const count = countConditions(value);
  const groups = value.groups.length ? value.groups : [{ combinator: "and" as const, conditions: [] }];

  function replaceGroup(index: number, group: FilterGroup<Field>) {
    onChange({ ...value, groups: groups.map((existing, position) => position === index ? group : existing) });
  }
  function addCondition(groupIndex: number) {
    const field = fields[0];
    if (!field) return;
    const group = groups[groupIndex]!;
    replaceGroup(groupIndex, { ...group, conditions: [...group.conditions, { field: field.id, operator: operatorsForFilterType(field.type)[0]!, value: null }] });
  }

  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger render={<Button variant="secondary" icon={<Icon name="filter" />} aria-label={count ? `${label}: ${count} ${count === 1 ? "condição" : "condições"}` : label}>{count ? `${label} · ${count}` : label}</Button>} />
    <PopoverContent title={label} className={s.panel}>
      {groups.length > 1 && <SegmentedControl label="Como combinar os grupos" value={value.combinator} options={GROUP_COMBINATORS} onValueChange={(combinator) => onChange({ ...value, combinator })} />}
      {groups.map((group, groupIndex) => <section key={groupIndex} className={s.group} aria-label={groups.length > 1 ? `Grupo ${groupIndex + 1}` : "Condições"}>
        <header className={s.groupHeader}>
          <span className={s.groupTitle}>{groups.length > 1 ? `Grupo ${groupIndex + 1}` : "Condições"}</span>
          {group.conditions.length > 1 && <SegmentedControl label={groups.length > 1 ? `Como combinar as condições do grupo ${groupIndex + 1}` : "Como combinar as condições"} value={group.combinator} options={COMBINATORS} onValueChange={(combinator) => replaceGroup(groupIndex, { ...group, combinator })} />}
          {groups.length > 1 && <Button iconOnly size="sm" variant="ghost" shape="rounded" aria-label={`Remover grupo ${groupIndex + 1}`} icon={<Icon name="close" />} onClick={() => onChange({ ...value, groups: groups.filter((_, position) => position !== groupIndex) })} />}
        </header>
        {group.conditions.length === 0 && <p className={s.empty}>Nenhuma condição ainda.</p>}
        {group.conditions.map((condition, index) => <ConditionRow
          key={index}
          fields={fields}
          condition={condition}
          index={index}
          onChange={(next) => replaceGroup(groupIndex, { ...group, conditions: group.conditions.map((existing, position) => position === index ? next : existing) })}
          onRemove={() => replaceGroup(groupIndex, { ...group, conditions: group.conditions.filter((_, position) => position !== index) })}
        />)}
        <Button variant="ghost" icon={<Icon name="plus" />} onClick={() => addCondition(groupIndex)}>Condição</Button>
      </section>)}
      <footer className={s.panelFooter}>
        <Button variant="ghost" icon={<Icon name="plus" />} onClick={() => onChange({ ...value, groups: [...groups, { combinator: "and", conditions: [] }] })}>Grupo</Button>
        {count > 0 && <Button variant="ghost" onClick={() => onChange({ combinator: "and", groups: [] })}>Limpar filtros</Button>}
      </footer>
    </PopoverContent>
  </Popover>;
}

interface ConditionRowProps<Field extends string> {
  fields: readonly FilterFieldDefinition<Field>[];
  condition: FilterCondition<Field>;
  index: number;
  onChange: (next: FilterCondition<Field>) => void;
  onRemove: () => void;
}

function ConditionRow<Field extends string>({ fields, condition, index, onChange, onRemove }: ConditionRowProps<Field>) {
  const field = fields.find((item) => item.id === condition.field);
  const operators = field ? operatorsForFilterType(field.type) : [];
  return <div className={s.row} role="group" aria-label={`Condição ${index + 1}`}>
    <Select
      label="Campo"
      value={field ? condition.field : null}
      placeholder="Campo"
      options={fields.map((item) => ({ value: item.id, label: item.label, ...(item.group ? { description: item.group } : {}) }))}
      onValueChange={(id) => {
        const next = fields.find((item) => item.id === id);
        if (next) onChange({ field: next.id, operator: operatorsForFilterType(next.type)[0]!, value: null });
      }}
    />
    {field && <Select
      label={`Operador de ${field.label}`}
      value={condition.operator}
      options={operators.map((operator) => ({ value: operator, label: filterOperatorLabel(operator) }))}
      onValueChange={(operator) => { if (operator) onChange({ ...condition, operator: operator as FilterOperator, value: fitValue(operator as FilterOperator, condition.value) }); }}
    />}
    {field && filterOperatorNeedsValue(condition.operator) && <ValueEditor field={field} condition={condition} onChange={onChange} />}
    <Button iconOnly size="sm" variant="ghost" shape="rounded" className={s.remove} aria-label={`Remover condição ${index + 1}`} icon={<Icon name="close" />} onClick={onRemove} />
  </div>;
}

function ValueEditor<Field extends string>({ field, condition, onChange }: { field: FilterFieldDefinition<Field>; condition: FilterCondition<Field>; onChange: (next: FilterCondition<Field>) => void }) {
  const label = `Valor de ${field.label}`;
  const many = filterOperatorAcceptsMany(condition.operator);
  const list = Array.isArray(condition.value) ? condition.value : condition.value ? [condition.value] : [];
  const single = Array.isArray(condition.value) ? (condition.value[0] ?? "") : (condition.value ?? "");

  if (field.type === "date") return <DatePicker label={label} value={single} onValueChange={(next) => onChange({ ...condition, value: next || null })} />;
  if (field.options) {
    const options = field.options.map((option) => ({ value: option.value, label: option.label }));
    if (many) return <Select<true> multiple label={label} placeholder="Selecionar um ou mais" value={list} options={options} onValueChange={(next) => onChange({ ...condition, value: next.length ? next : null })} />;
    return <Select label={label} placeholder="Selecionar" value={single || null} options={options} onValueChange={(next) => onChange({ ...condition, value: next || null })} />;
  }
  if (many) return <Input aria-label={label} placeholder="valor, outro valor" value={list.join(", ")} onChange={(event) => { const values = event.target.value.split(",").map((item) => item.trim()).filter(Boolean); onChange({ ...condition, value: values.length ? values : null }); }} />;
  return <Input aria-label={label} type={field.type === "number" ? "number" : "text"} value={single} onChange={(event) => onChange({ ...condition, value: event.target.value || null })} />;
}
