import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Fileira, Mesa, Palco, Prancha, Secao } from "../storybook/Prancha.js";
import { TagPicker } from "./TagPicker.js";

const options = [
  { value: "cliente", label: "cliente", color: "blue" },
  { value: "demo", label: "demo", color: "amber" },
  { value: "Teste CRM", label: "Teste CRM", color: "purple" },
  { value: "renovação", label: "renovação", color: "green" },
  { value: "risco", label: "risco", color: "red" },
  { value: "parceiro", label: "parceiro" },
];
const meta: Meta<typeof TagPicker> = { title: "Campos/Etiquetas", component: TagPicker, args: { label: "Etiquetas do negócio", options, value: ["cliente", "demo"], onValueChange: () => undefined, disabled: false } };
export default meta;
type Story = StoryObj<typeof TagPicker>;

function Example({ initial, disabled = false, creatable = false, appearance = "field" }: { initial: string[]; disabled?: boolean; creatable?: boolean; appearance?: "field" | "inline" }) {
  const [value, setValue] = useState(initial);
  return <TagPicker appearance={appearance} label="Etiquetas do negócio" options={options} value={value} onValueChange={setValue} disabled={disabled} {...(creatable ? { onCreate: (name: string) => setValue((current) => [...current, name]) } : {})} />;
}

export const Interativo: Story = { render: (args) => <Palco altura={320}><Mesa largura={380}><Example initial={[...args.value]} disabled={args.disabled ?? false} creatable /></Mesa></Palco> };

export const Variantes: Story = {
  render: () => <Prancha><Secao titulo="Estados" descricao="Caixa cavada com chips de folha; a cor da etiqueta é o ponto de 6px.">
    <Fileira rotulo="Com etiquetas"><Mesa largura={380}><Example initial={["cliente", "demo", "Teste CRM"]} /></Mesa></Fileira>
    <Fileira rotulo="Vazia"><Mesa largura={380}><Example initial={[]} /></Mesa></Fileira>
    <Fileira rotulo="Só leitura"><Mesa largura={380}><Example initial={["cliente", "renovação"]} disabled /></Mesa></Fileira>
    <Fileira rotulo="Só leitura, vazia"><Mesa largura={380}><Example initial={[]} disabled /></Mesa></Fileira>
    <Fileira rotulo="Muitas, estreita"><Mesa largura={240}><Example initial={options.map((option) => option.value)} /></Mesa></Fileira>
  </Secao></Prancha>,
};

export const NaFicha: Story = {
  render: () => <Prancha><Secao titulo="Etiquetas na ficha" descricao="Metadados em linha; busca abre pelo botão de adicionar.">
    <Fileira rotulo="Com etiquetas"><Mesa largura={380}><Example appearance="inline" initial={["cliente", "Teste CRM"]} creatable /></Mesa></Fileira>
    <Fileira rotulo="Sem etiquetas"><Mesa largura={380}><Example appearance="inline" initial={[]} creatable /></Mesa></Fileira>
    <Fileira rotulo="Estreita"><Mesa largura={240}><Example appearance="inline" initial={options.map((option) => option.value)} /></Mesa></Fileira>
    <Fileira rotulo="Só leitura"><Mesa largura={240}><Example appearance="inline" initial={["cliente", "renovação"]} disabled /></Mesa></Fileira>
  </Secao></Prancha>,
};
