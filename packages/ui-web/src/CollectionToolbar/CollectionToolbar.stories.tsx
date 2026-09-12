import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { CollectionToolbar } from "./CollectionToolbar.js";
import { Input } from "../Input/Input.js";
import { Select } from "../Select/Select.js";
import { Icon } from "../Icon/Icon.js";
import { Button } from "../Button/Button.js";

const meta: Meta<typeof CollectionToolbar> = { title: "Tabelas/Barra de ferramentas", component: CollectionToolbar };
export default meta;
type Story = StoryObj<typeof CollectionToolbar>;

export const BuscaEFiltro: Story = { render: () => <Example /> };
export const FiltrosEmTelaEstreita: Story = { render: () => <MultipleFilters /> };

function Example() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  return <CollectionToolbar
    search={<Input aria-label="Buscar páginas" startAdornment={<Icon name="search" />} placeholder="Buscar páginas" value={search} onChange={(event) => setSearch(event.target.value)} />}
    filters={<Select label="Filtrar por situação" value={status} options={[{ value: "all", label: "Todas as situações" }, { value: "draft", label: "Rascunhos" }, { value: "published", label: "Publicadas" }]} onValueChange={(value) => setStatus(value ?? "all")} />}
    actions={<Button variant="secondary" onClick={() => setStatus("draft")}>Ver rascunhos</Button>}
    count="12 páginas"
  />;
}

function MultipleFilters() {
  const [stage, setStage] = useState("all");
  const [owner, setOwner] = useState("all");
  const [period, setPeriod] = useState("week");
  return <CollectionToolbar
    search={<Input aria-label="Buscar contatos" startAdornment={<Icon name="search" />} placeholder="Buscar contatos" />}
    filters={<>
      <Select appearance="filter" label="Etapa" value={stage} options={[{ value: "all", label: "Todas as etapas" }, { value: "new", label: "Novos leads" }]} onValueChange={(value) => setStage(value ?? "all")} />
      <Select appearance="filter" label="Responsável" value={owner} options={[{ value: "all", label: "Todos os responsáveis" }, { value: "mine", label: "Meus contatos" }]} onValueChange={(value) => setOwner(value ?? "all")} />
      <Select appearance="filter" label="Período" value={period} options={[{ value: "week", label: "Esta semana" }, { value: "month", label: "Este mês" }]} onValueChange={(value) => setPeriod(value ?? "week")} />
    </>}
    count="12 contatos"
  />;
}
