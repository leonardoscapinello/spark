import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { CalendarWeek } from "./CalendarWeek.js";

const meta: Meta<typeof CalendarWeek> = { title: "Dashboard/Agenda semanal", component: CalendarWeek };
export default meta;
type Story = StoryObj<typeof CalendarWeek>;

export const Atividades: Story = { render: () => <Example /> };

function Example() {
  const [week, setWeek] = useState(() => new Date(2026, 8, 9));
  return <CalendarWeek label="atividades" week={week} onWeekChange={setWeek} items={[
    { id: "meeting", date: "2026-09-09", hour: 10, content: <><strong>Reunião comercial</strong><br />10:30 · Maria</> },
    { id: "call", date: "2026-09-11", hour: 14, content: <><strong>Retornar ligação</strong><br />14:00 · João</> },
  ]} />;
}
