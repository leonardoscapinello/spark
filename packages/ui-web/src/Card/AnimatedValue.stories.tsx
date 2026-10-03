import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { AnimatedValue } from "./AnimatedValue.js";
import { MetricCard } from "./Card.js";
import { Button } from "../Button/Button.js";

const meta: Meta<typeof AnimatedValue> = { title: "Dados/Valor animado", component: AnimatedValue, args: { value: "R$ 1.250,00" } };
export default meta;
type Story = StoryObj<typeof AnimatedValue>;
export const Valor: Story = {};
export const Atualizacao: Story = { render: () => <Example /> };
function Example() {
  const [value, setValue] = useState(1250);
  return <MetricCard title="Receita ilustrativa" value={new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)} actions={<Button variant="secondary" onClick={() => setValue(current => current === 1250 ? 1890 : 1250)}>Atualizar exemplo</Button>} />;
}
