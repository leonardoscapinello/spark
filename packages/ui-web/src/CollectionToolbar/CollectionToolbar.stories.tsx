import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { CollectionToolbar } from "./CollectionToolbar.js";
import { Input } from "../Input/Input.js";
import { Select } from "../Select/Select.js";
import { Icon } from "../Icon/Icon.js";

const meta: Meta<typeof CollectionToolbar> = { title: "Tabelas/Barra de ferramentas", component: CollectionToolbar };
export default meta;
type Story = StoryObj<typeof CollectionToolbar>;

export const BuscaEFiltro: Story = { render: () => <Example /> };

function Example() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  return <CollectionToolbar
    search={<Input aria-label="Buscar páginas" startAdornment={<Icon name="search" />} placeholder="Buscar páginas" value={search} onChange={(event) => setSearch(event.target.value)} />}
    filters={<Select label="Filtrar por situação" value={status} options={[{ value: "all", label: "Todas as situações" }, { value: "draft", label: "Rascunhos" }, { value: "published", label: "Publicadas" }]} onValueChange={(value) => setStatus(value ?? "all")} />}
    count="12 páginas"
  />;
}
