import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { CalendarEntry } from "../CalendarEntry/CalendarEntry.js";
import { Signal } from "../Signal/Signal.js";
import { Fileira, Mesa, Prancha, Secao } from "../storybook/Prancha.js";
import { CalendarMonth, type CalendarMonthItem } from "./CalendarMonth.js";

const meta: Meta<typeof CalendarMonth> = { title: "Dados/Calendário do mês", component: CalendarMonth, args: { label: "publicações", month: new Date(2026, 9, 1), items: [], onMonthChange: () => undefined } };
export default meta;
type Story = StoryObj<typeof CalendarMonth>;

const ITEMS: CalendarMonthItem[] = [
  { id: "1", date: "2026-10-02", content: <CalendarEntry time="09:00" title="Post de lançamento" detail="Instagram" status={<Signal tone="success">Publicado</Signal>} /> },
  { id: "2", date: "2026-10-02", content: <CalendarEntry time="18:00" title="Reels da semana" detail="Instagram" status={<Signal tone="info">Agendado</Signal>} /> },
  { id: "3", date: "2026-10-14", content: <CalendarEntry time="12:00" title="Campanha de fim de ano com descontos progressivos" detail="Facebook" status={<Signal tone="danger">Falhou</Signal>} /> },
];

function Example({ items = ITEMS, initial = new Date(2026, 9, 1) }: { items?: CalendarMonthItem[]; initial?: Date }) {
  const [month, setMonth] = useState(initial);
  return <CalendarMonth label="publicações" month={month} items={items} onMonthChange={setMonth} />;
}

export const Interativo: Story = { render: () => <Example /> };
export const Variantes: Story = {
  render: () => <Prancha><Secao titulo="Mês" descricao="Folha pousada; número do dia em mono numa pílula de 28; hoje com anel de 1px.">
    <Fileira rotulo="Com compromissos" topo><Mesa largura={980}><Example /></Mesa></Fileira>
    <Fileira rotulo="Vazio" topo><Mesa largura={980}><Example items={[]} /></Mesa></Fileira>
    <Fileira rotulo="Mês atual (hoje)" topo><Mesa largura={980}><Example items={[]} initial={new Date(new Date().getFullYear(), new Date().getMonth(), 1)} /></Mesa></Fileira>
    <Fileira rotulo="Estreito (rola)" topo><Mesa largura={420}><Example /></Mesa></Fileira>
  </Secao></Prancha>,
};
export const MuitosItens: Story = { render: () => <Example items={Array.from({ length: 24 }, (_, index) => ({ id: String(index), date: `2026-10-${String((index % 8) + 6).padStart(2, "0")}`, content: <CalendarEntry time={`${String(8 + (index % 9)).padStart(2, "0")}:00`} title={`Publicação ${index + 1}`} detail="Instagram" /> }))} /> };
