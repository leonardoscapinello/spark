import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Fileira, Mesa, Palco, Prancha, Secao } from "../storybook/Prancha.js";
import { DateTimePicker, type DateTimeMode } from "./DateTimePicker.js";

const meta: Meta<typeof DateTimePicker> = { title: "Campos/Data e hora", component: DateTimePicker, args: { label: "Previsão de fechamento", value: "2026-10-15", mode: "date", disabled: false, onValueChange: () => undefined } };
export default meta;
type Story = StoryObj<typeof DateTimePicker>;

function Example({ mode, initial, disabled = false, label }: { mode: DateTimeMode; initial: string; disabled?: boolean; label?: string }) {
  const [value, setValue] = useState(initial);
  return <DateTimePicker label={label ?? (mode === "date" ? "Data" : mode === "time" ? "Hora" : "Data e hora")} mode={mode} value={value} onValueChange={setValue} disabled={disabled} />;
}

export const Interativo: Story = { render: (args) => <Palco altura={460}><Mesa largura={280}><Example mode={args.mode ?? "date"} initial={args.value} disabled={args.disabled ?? false} label={args.label} /></Mesa></Palco> };

export const Variantes: Story = {
  render: () => <Prancha><Secao titulo="Modos e estados" descricao="Gatilho de escolha com valor em mono; folha sólida de raio 32; dia escolhido em carvão, hoje com anel.">
    <Fileira rotulo="Data"><Mesa largura={240}><Example mode="date" initial="2026-10-15" /></Mesa><Mesa largura={240}><Example mode="date" initial="" /></Mesa></Fileira>
    <Fileira rotulo="Data e hora"><Mesa largura={240}><Example mode="datetime" initial="2026-10-21T14:30" /></Mesa><Mesa largura={240}><Example mode="datetime" initial="" /></Mesa></Fileira>
    <Fileira rotulo="Hora"><Mesa largura={240}><Example mode="time" initial="09:00" /></Mesa><Mesa largura={240}><Example mode="time" initial="" /></Mesa></Fileira>
    <Fileira rotulo="Fora do passo"><Mesa largura={240}><Example mode="datetime" initial="2026-10-21T11:37" /></Mesa></Fileira>
    <Fileira rotulo="Desabilitado"><Mesa largura={240}><Example mode="date" initial="2026-10-15" disabled /></Mesa></Fileira>
    <Fileira rotulo="Estreito"><Mesa largura={150}><Example mode="datetime" initial="2026-10-21T14:30" /></Mesa></Fileira>
  </Secao></Prancha>,
};

export const Folhas: Story = {
  name: "Folhas abertas",
  render: () => <Palco altura={520}><Fileira rotulo="Abra cada uma"><Mesa largura={240}><Example mode="date" initial="2026-10-15" /></Mesa><Mesa largura={240}><Example mode="datetime" initial="2026-10-21T14:30" /></Mesa><Mesa largura={240}><Example mode="time" initial="09:00" /></Mesa></Fileira></Palco>,
};
