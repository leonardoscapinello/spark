import type { Meta, StoryObj } from "@storybook/react-vite";
import { Signal } from "../Signal/Signal.js";
import { Fileira, Mesa, Prancha, Secao } from "../storybook/Prancha.js";
import { CalendarEntry } from "./CalendarEntry.js";

const meta: Meta<typeof CalendarEntry> = { title: "Dados/Compromisso no calendário", component: CalendarEntry, args: { time: "09:30", title: "Reunião de proposta", detail: "Carla Prado", done: false } };
export default meta;
type Story = StoryObj<typeof CalendarEntry>;

export const Interativo: Story = { render: (args) => <Mesa largura={160}><CalendarEntry {...args} /></Mesa> };

export const Variantes: Story = {
  render: () => <Prancha><Secao titulo="Estados" descricao="Hora em mono, título de uma linha, apoio em tinta 3, estado como sinal.">
    <Fileira rotulo="Agendada"><Mesa largura={160}><CalendarEntry time="09:30" title="Reunião de proposta" detail="Carla Prado" status={<Signal tone="info">Reunião</Signal>} /></Mesa></Fileira>
    <Fileira rotulo="Atrasada"><Mesa largura={160}><CalendarEntry time="14:00" title="Ligar para Ana" detail="Ana Oliveira" status={<Signal tone="danger">Atrasada</Signal>} /></Mesa></Fileira>
    <Fileira rotulo="Concluída"><Mesa largura={160}><CalendarEntry time="17:00" title="Enviar contrato" detail="Tarefa" done status={<Signal tone="success">Concluída</Signal>} /></Mesa></Fileira>
    <Fileira rotulo="Dia todo"><Mesa largura={160}><CalendarEntry time="Dia todo" title="Feriado" detail="Google" /></Mesa></Fileira>
    <Fileira rotulo="Texto longo"><Mesa largura={120}><CalendarEntry time="10:00–11:30" title="Workshop de implantação com a equipe" detail="Companhia Brasileira de Distribuição" /></Mesa></Fileira>
  </Secao></Prancha>,
};
