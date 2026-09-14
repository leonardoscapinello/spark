import { useState } from "react";
import type { Meta } from "@storybook/react-vite";
import { FilterBar, type FilterFieldDefinition, type FilterSet } from "./FilterBar.js";

const meta: Meta<typeof FilterBar> = { title: "Dados/Filtros", component: FilterBar };
export default meta;

const fields: FilterFieldDefinition[] = [
  { id: "leadStatus", label: "Etapa", type: "select", group: "Pessoa", options: [{ value: "new", label: "Novo lead" }, { value: "qualified", label: "Qualificado" }, { value: "customer", label: "Cliente" }] },
  { id: "ownerId", label: "Responsável", type: "select", group: "Pessoa", options: [{ value: "u1", label: "Ana Prado" }, { value: "u2", label: "Bruno Dias" }] },
  { id: "score", label: "Pontuação", type: "number", group: "Pessoa" },
  { id: "createdAt", label: "Criado em", type: "date", group: "Pessoa" },
  { id: "tags", label: "Marcações", type: "list", group: "Pessoa" },
  { id: "custom:plano", label: "Plano", type: "text", group: "Campos personalizados" },
  { id: "custom:renovacao", label: "Renovação", type: "date", group: "Campos personalizados" },
];

export const Vazio = () => <Example initial={{ combinator: "and", groups: [] }} />;
export const ComGrupos = () => <Example initial={{ combinator: "or", groups: [
  { combinator: "and", conditions: [{ field: "leadStatus", operator: "in", value: ["new", "qualified"] }, { field: "score", operator: "gt", value: "50" }] },
  { combinator: "and", conditions: [{ field: "ownerId", operator: "is", value: "u1" }, { field: "createdAt", operator: "after", value: "2026-01-01" }] },
] }} />;

function Example({ initial }: { initial: FilterSet }) {
  const [value, setValue] = useState<FilterSet>(initial);
  return <FilterBar fields={fields} value={value} onChange={setValue} />;
}
