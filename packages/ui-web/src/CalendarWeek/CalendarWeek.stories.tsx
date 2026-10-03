import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { CalendarEntry } from "../CalendarEntry/CalendarEntry.js";
import { Signal } from "../Signal/Signal.js";
import { Fileira, Mesa, Prancha, Secao } from "../storybook/Prancha.js";
import { CalendarWeek, type CalendarWeekItem } from "./CalendarWeek.js";

const meta: Meta<typeof CalendarWeek> = { title: "Dados/Agenda da semana", component: CalendarWeek, args: { label: "atividades", week: new Date(2026, 8, 9), items: [], onWeekChange: () => undefined } };
export default meta;
type Story = StoryObj<typeof CalendarWeek>;

const ITEMS: CalendarWeekItem[] = [
  { id: "meeting", date: "2026-09-09", hour: 10, content: <CalendarEntry time="10:30" title="Reunião comercial" detail="Maria Oliveira" status={<Signal tone="info">Reunião</Signal>} /> },
  { id: "call", date: "2026-09-11", hour: 14, content: <CalendarEntry time="14:00" title="Retornar ligação" detail="João Silva" status={<Signal tone="danger">Atrasada</Signal>} /> },
  { id: "done", date: "2026-09-08", hour: 9, content: <CalendarEntry time="09:00" title="Enviar contrato" detail="Tarefa" done status={<Signal tone="success">Concluída</Signal>} /> },
];

function Example({ items = ITEMS, initial = new Date(2026, 8, 9) }: { items?: CalendarWeekItem[]; initial?: Date }) {
  const [week, setWeek] = useState(initial);
  return <CalendarWeek label="atividades" week={week} items={items} onWeekChange={setWeek} />;
}

export const Interativo: Story = { render: () => <Example /> };
export const Variantes: Story = {
  render: () => <Prancha><Secao titulo="Semana" descricao="Horas em mono; o dia de hoje tem o anel e o fundo de realce.">
    <Fileira rotulo="Com atividades" topo><Mesa largura={980}><Example /></Mesa></Fileira>
    <Fileira rotulo="Vazia" topo><Mesa largura={980}><Example items={[]} /></Mesa></Fileira>
    <Fileira rotulo="Semana atual (hoje)" topo><Mesa largura={980}><Example items={[]} initial={new Date()} /></Mesa></Fileira>
    <Fileira rotulo="Estreita (rola)" topo><Mesa largura={420}><Example /></Mesa></Fileira>
  </Secao></Prancha>,
};
export const MuitasAtividades: Story = { render: () => <Example items={Array.from({ length: 20 }, (_, index) => ({ id: String(index), date: `2026-09-${String(7 + (index % 5)).padStart(2, "0")}`, hour: 8 + (index % 10), content: <CalendarEntry time={`${String(8 + (index % 10)).padStart(2, "0")}:30`} title={`Atividade ${index + 1}`} detail="Ligação" /> }))} /> };
