import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Fileira, Palco, Prancha, Secao } from "../storybook/Prancha.js";
import { OwnerPicker } from "./OwnerPicker.js";

const people = [
  { id: "1", name: "Leonardo Scapinello" },
  { id: "2", name: "Carla Prado" },
  { id: "3", name: "Rafael Moura" },
  { id: "4", name: "Júlia Lima", deactivatedAt: "2026-01-01T00:00:00Z" },
];

const meta: Meta<typeof OwnerPicker> = { title: "Campos/Responsável", component: OwnerPicker, args: { label: "Responsável pelo negócio", people, value: "1", onChange: () => undefined, disabled: false, size: "md" } };
export default meta;
type Story = StoryObj<typeof OwnerPicker>;

function Example({ initial, size = "md", disabled = false, list = people }: { initial: string | null; size?: "sm" | "md" | "lg"; disabled?: boolean; list?: typeof people }) {
  const [value, setValue] = useState<string | null>(initial);
  return <OwnerPicker label="Responsável pelo negócio" people={list} value={value} onChange={setValue} size={size} disabled={disabled} />;
}

export const Interativo: Story = { render: (args) => <Palco altura={320}><Example initial={args.value} size={args.size ?? "md"} disabled={args.disabled ?? false} /></Palco> };

export const Variantes: Story = {
  render: () => <Prancha><Secao titulo="Gatilho" descricao="Avatar no encaixe de ícone do botão: o nome começa no mesmo x de qualquer outro gatilho.">
    <Fileira rotulo="Tamanhos"><Example initial="1" size="sm" /><Example initial="1" size="md" /><Example initial="1" size="lg" /></Fileira>
    <Fileira rotulo="Sem responsável"><Example initial={null} /></Fileira>
    <Fileira rotulo="Desabilitado"><Example initial="2" disabled /></Fileira>
    <Fileira rotulo="Nome longo"><Example initial="9" list={[...people, { id: "9", name: "Ana Beatriz de Oliveira Santos Pereira" }]} /></Fileira>
  </Secao></Prancha>,
};
