import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Matriz, Prancha, Secao } from "../storybook/Prancha.js";
import { SegmentedControl, type SegmentedOption } from "./SegmentedControl.js";

type Periodo = "7d" | "30d" | "90d" | "12m";
const PERIODOS: readonly SegmentedOption<Periodo>[] = [{ value: "7d", label: "7 dias" }, { value: "30d", label: "30 dias" }, { value: "90d", label: "90 dias" }, { value: "12m", label: "12 meses" }];

function Controlado({ tone, size, opcoes = PERIODOS }: { tone?: "papel" | "carvao"; size?: "sm" | "md"; opcoes?: readonly SegmentedOption<Periodo>[] }) {
  const [valor, setValor] = useState<Periodo>("30d");
  return <SegmentedControl label="Período" value={valor} onValueChange={setValor} options={opcoes} {...(tone ? { tone } : {})} {...(size ? { size } : {})} />;
}

const meta = {
  title: "Escolhas/Controle segmentado",
  component: SegmentedControl,
  args: { label: "Período", value: "30d", options: PERIODOS, onValueChange: () => undefined, tone: "papel", size: "md" },
  argTypes: { tone: { control: "inline-radio", options: ["papel", "carvao"] }, size: { control: "inline-radio", options: ["sm", "md"] }, options: { control: false } },
  parameters: {
    docs: { description: { component: "Troca de modo ou de período. A folha do item ativo desliza até ele em 550 ms; o item ativo não pinta a si mesmo. Papel para filtros; carvão para o modo principal da tela." } },
  },
} satisfies Meta<typeof SegmentedControl>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Interativo: Story = { render: args => <Controlado tone={args.tone ?? "papel"} size={args.size ?? "md"} /> };

export const Variantes: Story = {
  render: () => (
    <Prancha>
      <Secao titulo="Tom × tamanho" descricao="Clique para ver a folha deslizar.">
        <Matriz
          colunas={["md", "sm"]}
          linhas={(["papel", "carvao"] as const).map(tom => ({ rotulo: tom === "papel" ? "Papel" : "Carvão", celulas: [<Controlado tone={tom} size="md" />, <Controlado tone={tom} size="sm" />] }))}
        />
      </Secao>
      <Secao titulo="Opção indisponível">
        <Controlado opcoes={[...PERIODOS.slice(0, 3), { value: "12m", label: "12 meses", disabled: true }]} />
      </Secao>
    </Prancha>
  ),
};
