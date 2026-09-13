import { useState } from "react";
import type { Meta as StoryMeta, StoryObj } from "@storybook/react-vite";
import { Badge } from "../Feedback/Feedback.js";
import { CalendarMonth } from "./CalendarMonth.js";

const meta: StoryMeta<typeof CalendarMonth> = {
  title: "Fundamentos/Calendário mensal",
  component: CalendarMonth,
};
export default meta;
type Story = StoryObj<typeof CalendarMonth>;

function CalendarExample() {
  const [month, setMonth] = useState(new Date(2026, 8, 1));
  return <CalendarMonth label="publicações" month={month} onMonthChange={setMonth} items={[
    { id: "a", date: "2026-09-03", content: <><strong>Instagram</strong><p>Lançamento da campanha</p><Badge tone="success">Publicado</Badge></> },
    { id: "b", date: "2026-09-14", content: <><strong>LinkedIn</strong><p>Novidades da equipe</p><Badge tone="warning">Agendado</Badge></> },
  ]} />;
}

export const Publicacoes: Story = { render: () => <CalendarExample /> };
