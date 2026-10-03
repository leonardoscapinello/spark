import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Fileira, Palco, Prancha, Secao } from "../storybook/Prancha.js";
import { FilterBar, type FilterFieldDefinition, type FilterSet } from "./FilterBar.js";

const meta: Meta<typeof FilterBar> = { title: "Estrutura/Filtros", component: FilterBar };
export default meta;
type Story = StoryObj<typeof FilterBar>;

const fields: FilterFieldDefinition[] = [
  { id: "leadStatus", label: "Etapa", type: "select", group: "Pessoa", options: [{ value: "new", label: "Novo lead" }, { value: "qualified", label: "Qualificado" }, { value: "customer", label: "Cliente" }] },
  { id: "ownerId", label: "Responsável", type: "select", group: "Pessoa", options: [{ value: "u1", label: "Ana Prado" }, { value: "u2", label: "Bruno Dias" }] },
  { id: "score", label: "Pontuação", type: "number", group: "Pessoa" },
  { id: "createdAt", label: "Criado em", type: "date", group: "Pessoa" },
  { id: "tags", label: "Marcações", type: "list", group: "Pessoa" },
  { id: "custom:plano", label: "Plano", type: "text", group: "Campos personalizados" },
  { id: "custom:renovacao", label: "Renovação", type: "date", group: "Campos personalizados" },
];
const VAZIO: FilterSet = { combinator: "and", groups: [] };
const UMA: FilterSet = { combinator: "and", groups: [{ combinator: "and", conditions: [{ field: "leadStatus", operator: "in", value: ["new", "qualified"] }] }] };
const GRUPOS: FilterSet = { combinator: "or", groups: [
  { combinator: "and", conditions: [{ field: "leadStatus", operator: "in", value: ["new", "qualified"] }, { field: "score", operator: "gt", value: "50" }] },
  { combinator: "and", conditions: [{ field: "ownerId", operator: "is", value: "u1" }, { field: "createdAt", operator: "after", value: "2026-01-01" }] },
] };

function Exemplo({ initial }: { initial: FilterSet }) {
  const [value, setValue] = useState<FilterSet>(initial);
  return <FilterBar fields={fields} value={value} onChange={setValue} />;
}

export const Interativo: Story = { render: () => <Palco altura={420}><Exemplo initial={VAZIO} /></Palco> };
export const Variantes: Story = { render: () => <Prancha><Secao titulo="Pílula «Filtros · N»" descricao="Com um filtro ou vinte, é a mesma pílula; o construtor abre num painel largo.">
  <Fileira rotulo="Sem condição"><Exemplo initial={VAZIO} /></Fileira>
  <Fileira rotulo="Uma condição"><Exemplo initial={UMA} /></Fileira>
  <Fileira rotulo="Grupos E/OU"><Exemplo initial={GRUPOS} /></Fileira>
</Secao></Prancha> };
export const ComGrupos: Story = { render: () => <Palco altura={520}><Exemplo initial={GRUPOS} /></Palco> };
