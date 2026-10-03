import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Fileira, Mesa, Prancha, Secao } from "../storybook/Prancha.js";
import { SearchField, type SearchFieldProps } from "./SearchField.js";

function Controlada(props: Omit<SearchFieldProps, "value" | "onValueChange"> & { inicial?: string }) {
  const { inicial = "", shortcut, ...rest } = props;
  const [value, setValue] = useState(inicial);
  return <SearchField {...rest} {...(shortcut ? { shortcut } : {})} value={value} onValueChange={setValue} />;
}

const meta: Meta<typeof Controlada> = {
  title: "Campos/Busca",
  component: Controlada,
  args: { label: "Buscar pessoas", placeholder: "Buscar por nome, e-mail ou telefone", inicial: "", loading: false, disabled: false, shortcut: "" },
};
export default meta;
type Story = StoryObj<typeof Controlada>;

export const Interativo: Story = { render: (args) => <Mesa largura={360}><Controlada {...args} /></Mesa> };

export const Variantes: Story = { render: () => <Prancha>
  <Secao titulo="Estados" descricao="Campo de verdade: lupa de 16, × de 28 com texto, Esc limpa. A altura segue o campo (40), ou 36 na barra de coleção.">
    <Fileira rotulo="Vazia"><Mesa largura={320}><Controlada label="Buscar" placeholder="Buscar" /></Mesa></Fileira>
    <Fileira rotulo="Com texto"><Mesa largura={320}><Controlada label="Buscar" inicial="Ana" /></Mesa></Fileira>
    <Fileira rotulo="Buscando"><Mesa largura={320}><Controlada label="Buscar" inicial="Ana" loading /></Mesa></Fileira>
    <Fileira rotulo="Com atalho"><Mesa largura={320}><Controlada label="Busca global" placeholder="Buscar" shortcut="⌘K" /></Mesa></Fileira>
    <Fileira rotulo="Desabilitada"><Mesa largura={320}><Controlada label="Buscar" placeholder="Busca indisponível" disabled /></Mesa></Fileira>
  </Secao>
</Prancha> };

export const TextoLongo: Story = { render: () => <Mesa largura={200}><Controlada label="Buscar" inicial="ana.beatriz.figueiredo@aurora-comercio-exterior.com.br" /></Mesa> };
export const Estreita: Story = { render: () => <Mesa largura={160}><Controlada label="Buscar" placeholder="Buscar por nome, e-mail ou telefone" /></Mesa> };
