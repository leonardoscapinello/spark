import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Fileira, Mesa, Prancha, Secao } from "../storybook/Prancha.js";
import { PersonChoice } from "./PersonChoice.js";

const meta: Meta<typeof PersonChoice> = { title: "Escolhas/Escolha de pessoa", component: PersonChoice, args: { name: "Maria Silva", detail: "maria@exemplo.com", checked: false, disabled: false, onCheckedChange: () => undefined } };
export default meta;
type Story = StoryObj<typeof PersonChoice>;

function Example({ name, detail, initial = false, disabled = false }: { name: string; detail?: string; initial?: boolean; disabled?: boolean }) {
  const [checked, setChecked] = useState(initial);
  return <PersonChoice name={name} {...(detail ? { detail } : {})} checked={checked} disabled={disabled} onCheckedChange={setChecked} />;
}

export const Interativo: Story = { render: (args) => <Mesa largura={320}><Example name={args.name} {...(args.detail ? { detail: args.detail } : {})} initial={args.checked} disabled={args.disabled ?? false} /></Mesa> };

export const Variantes: Story = {
  render: () => <Prancha><Secao titulo="Estados" descricao="Linha de tinta; marcada vira folha pousada em --r-rico.">
    <Fileira rotulo="Desmarcada"><Mesa largura={320}><Example name="Maria Silva" detail="maria@exemplo.com" /></Mesa></Fileira>
    <Fileira rotulo="Marcada"><Mesa largura={320}><Example name="Carla Prado" detail="carla@acme.com" initial /></Mesa></Fileira>
    <Fileira rotulo="Sem detalhe"><Mesa largura={320}><Example name="Rafael Moura" /></Mesa></Fileira>
    <Fileira rotulo="Desabilitada"><Mesa largura={320}><Example name="Júlia Lima" detail="Desativada" disabled /></Mesa></Fileira>
    <Fileira rotulo="Texto longo"><Mesa largura={220}><Example name="Ana Beatriz de Oliveira Santos" detail="ana.beatriz.oliveira@empresa-muito-grande.com.br" /></Mesa></Fileira>
  </Secao></Prancha>,
};
