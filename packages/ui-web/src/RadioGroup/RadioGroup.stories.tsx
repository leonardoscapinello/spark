import type { Meta, StoryObj } from "@storybook/react-vite";
import { Fileira, Prancha, Secao } from "../storybook/Prancha.js";
import { RadioGroup } from "./RadioGroup.js";

const VISIBILIDADE = [
  { value: "eu", label: "Somente eu" },
  { value: "equipe", label: "Minha equipe" },
  { value: "todos", label: "Toda a organização" },
];

const meta = {
  title: "Escolhas/Opção única",
  component: RadioGroup,
  args: { label: "Visibilidade", options: VISIBILIDADE, defaultValue: "equipe", disabled: false },
  argTypes: { options: { control: false } },
  parameters: {
    docs: { description: { component: "Uma escolha entre poucas opções visíveis. Bolinha de 20 cavada; escolhida, vira carvão e o ponto de 7 nasce do centro com estalo." } },
  },
} satisfies Meta<typeof RadioGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Interativo: Story = {};

export const Estados: Story = {
  render: () => (
    <Prancha>
      <Secao titulo="Estados">
        <Fileira rotulo="Sem escolha" topo><RadioGroup label="Prioridade" options={[{ value: "baixa", label: "Baixa" }, { value: "media", label: "Média" }, { value: "alta", label: "Alta" }]} /></Fileira>
        <Fileira rotulo="Com escolha" topo><RadioGroup label="Visibilidade" options={VISIBILIDADE} defaultValue="equipe" /></Fileira>
        <Fileira rotulo="Opção indisponível" topo><RadioGroup label="Plano" options={[{ value: "mensal", label: "Mensal" }, { value: "anual", label: "Anual" }, { value: "vitalicio", label: "Vitalício (encerrado)", disabled: true }]} defaultValue="anual" /></Fileira>
        <Fileira rotulo="Grupo desabilitado" topo><RadioGroup label="Visibilidade" options={VISIBILIDADE} defaultValue="eu" disabled /></Fileira>
      </Secao>
    </Prancha>
  ),
};
