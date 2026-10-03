import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Fileira, Prancha, Secao } from "../storybook/Prancha.js";
import { ViewSwitcher, type ViewMode } from "./ViewSwitcher.js";

function Controlado() {
  const [valor, setValor] = useState<ViewMode>("table");
  return <ViewSwitcher label="Visualização dos registros" value={valor} onValueChange={setValor} />;
}

const meta = {
  title: "Escolhas/Alternância de visualização",
  component: ViewSwitcher,
  args: { label: "Visualização dos registros", value: "table", onValueChange: () => undefined },
  parameters: {
    docs: { description: { component: "Tabela ou cartões. É o controle segmentado com ícones: a mesma folha deslizando." } },
  },
} satisfies Meta<typeof ViewSwitcher>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Interativo: Story = { render: () => <Controlado /> };

export const Estados: Story = {
  render: () => (
    <Prancha>
      <Secao titulo="Escolhas">
        <Fileira rotulo="Tabela"><ViewSwitcher label="Tabela escolhida" value="table" onValueChange={() => undefined} /></Fileira>
        <Fileira rotulo="Cartões"><ViewSwitcher label="Cartões escolhidos" value="cards" onValueChange={() => undefined} /></Fileira>
      </Secao>
    </Prancha>
  ),
};
