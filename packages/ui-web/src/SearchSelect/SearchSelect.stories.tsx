import type { Meta, StoryObj } from "@storybook/react-vite";
import { Field } from "../Field/Field.js";
import { Label } from "../Label/Label.js";
import type { SelectOption } from "../Select/Select.js";
import { Fileira, Mesa, Palco, Prancha, Secao } from "../storybook/Prancha.js";
import { SearchSelect } from "./SearchSelect.js";

const EQUIPES: readonly SelectOption[] = [
  { value: "vendas", label: "Vendas" },
  { value: "suporte", label: "Atendimento" },
  { value: "sucesso", label: "Sucesso do cliente" },
  { value: "financeiro", label: "Financeiro" },
  { value: "arquivada", label: "Equipe arquivada", disabled: true },
];
const PESSOAS: readonly SelectOption[] = [
  { value: "ana", label: "Ana Souza", description: "Atendimento", avatar: null },
  { value: "rafael", label: "Rafael Lima", description: "Vendas", avatar: null },
  { value: "beatriz", label: "Beatriz Nogueira", description: "Sucesso do cliente", avatar: null },
  { value: "carlos", label: "Carlos Dias", description: "Financeiro", avatar: null },
];

const meta = {
  title: "Campos/Seletor com busca",
  component: SearchSelect,
  args: { label: "Equipe", options: EQUIPES, placeholder: "Buscar equipe", searchPlacement: "field", disabled: false },
  argTypes: { searchPlacement: { control: "inline-radio", options: ["field", "dropdown"] }, options: { control: false } },
  parameters: {
    docs: { description: { component: "Seletor para listas longas. A busca fica no próprio campo ou dentro do menu; o menu é o mesmo vidro de lista." } },
  },
} satisfies Meta<typeof SearchSelect>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Interativo: Story = { decorators: [Story => <Palco altura={320}><Mesa largura={320}><Story /></Mesa></Palco>] };

export const Variantes: Story = {
  render: () => (
    <Prancha>
      <Secao titulo="Onde fica a busca">
        <Fileira rotulo="No campo"><Mesa largura={300}><SearchSelect label="Equipe no campo" options={EQUIPES} placeholder="Buscar equipe" /></Mesa></Fileira>
        <Fileira rotulo="No menu"><Mesa largura={300}><SearchSelect label="Equipe no menu" searchPlacement="dropdown" options={EQUIPES} placeholder="Selecionar equipe" /></Mesa></Fileira>
        <Fileira rotulo="Com pessoas"><Mesa largura={300}><SearchSelect label="Pessoa" searchPlacement="dropdown" options={PESSOAS} placeholder="Selecionar pessoa" /></Mesa></Fileira>
        <Fileira rotulo="Desabilitado"><Mesa largura={300}><SearchSelect label="Desabilitado" disabled options={EQUIPES} placeholder="Indisponível" /></Mesa></Fileira>
      </Secao>
    </Prancha>
  ),
};

export const SemResultado: Story = {
  name: "Sem resultado",
  tags: ["!autodocs"],
  render: () => (
    <Palco altura={260}>
      <Mesa largura={320}>
        <Field><Label>Equipe</Label><SearchSelect label="Equipe" options={EQUIPES} defaultInputValue="zzz" defaultOpen emptyText="Nenhuma equipe com esse nome" /></Field>
      </Mesa>
    </Palco>
  ),
};
