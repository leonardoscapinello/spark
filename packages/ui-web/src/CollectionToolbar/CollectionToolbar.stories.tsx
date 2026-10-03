import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "../Button/Button.js";
import { Icon } from "../Icon/Icon.js";
import { SearchField } from "../SearchField/SearchField.js";
import { Select } from "../Select/Select.js";
import { ViewSwitcher, type ViewMode } from "../ViewSwitcher/ViewSwitcher.js";
import { Fileira, Mesa, Prancha, Secao } from "../storybook/Prancha.js";
import { CollectionToolbar } from "./CollectionToolbar.js";

const meta: Meta<typeof CollectionToolbar> = { title: "Estrutura/Barra de coleção", component: CollectionToolbar };
export default meta;
type Story = StoryObj<typeof CollectionToolbar>;

function Completa({ selecionadas = 0 }: { selecionadas?: number }) {
  const [busca, setBusca] = useState("");
  const [situacao, setSituacao] = useState("all");
  const [modo, setModo] = useState<ViewMode>("table");
  return <CollectionToolbar
    search={<SearchField label="Buscar pessoas" placeholder="Buscar por nome, e-mail ou telefone" value={busca} onValueChange={setBusca} />}
    filters={<><Button variant="secondary" icon={<Icon name="filter" />}>Filtros</Button><Button variant="secondary" icon={<Icon name="star" />}>Visualizações</Button><Select appearance="filter" label="Situação" value={situacao} options={[{ value: "all", label: "Todas as situações" }, { value: "draft", label: "Rascunhos" }, { value: "published", label: "Publicadas" }]} onValueChange={(value) => setSituacao(value ?? "all")} /></>}
    actions={selecionadas ? <><Button variant="secondary">Arquivar</Button><Button variant="ghost">Limpar seleção</Button></> : <ViewSwitcher label="Visualização" value={modo} onValueChange={setModo} />}
    count={selecionadas ? `${selecionadas} de 12 selecionadas` : "12 pessoas"}
  />;
}

export const Interativo: Story = { render: () => <Completa /> };

export const Variantes: Story = { render: () => <Prancha>
  <Secao titulo="Composição" descricao="Busca e filtros numa linha (controles de 36), contagem 12/500 em tinta 2 e ações na de baixo.">
    <Fileira rotulo="Completa" coluna><Completa /></Fileira>
    <Fileira rotulo="Com seleção" coluna><Completa selecionadas={3} /></Fileira>
    <Fileira rotulo="Só busca" coluna><CollectionToolbar search={<SearchField label="Buscar ofertas" placeholder="Buscar regra de desconto" value="" onValueChange={() => undefined} />} count="4 regras" /></Fileira>
  </Secao>
</Prancha> };

export const Carregando: Story = { render: () => <CollectionToolbar search={<SearchField label="Buscar" value="" onValueChange={() => undefined} />} count="Carregando pessoas…" /> };
export const Estreita: Story = { render: () => <Mesa largura={360}><Completa /></Mesa> };
