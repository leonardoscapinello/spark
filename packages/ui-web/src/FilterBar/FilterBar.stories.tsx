import { useState } from "react";
import type { Meta } from "@storybook/react-vite";
import { FilterBar, type FilterCondition, type FilterFieldDefinition } from "./FilterBar.js";

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

export const Composicao = () => <Example initial={[]} />;
export const ComCondicoes = () => <Example initial={[{ field: "leadStatus", operator: "is", value: "qualified" }, { field: "score", operator: "gt", value: "50" }, { field: "custom:plano", operator: "contains", value: "Prem" }]} />;

function Example({ initial }: { initial: FilterCondition[] }) {
  const [filters, setFilters] = useState<FilterCondition[]>(initial);
  return <FilterBar fields={fields} filters={filters} onChange={setFilters} />;
}
