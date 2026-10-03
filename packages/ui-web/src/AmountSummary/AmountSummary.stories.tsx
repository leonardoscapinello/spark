import type { Meta, StoryObj } from "@storybook/react-vite";
import { AmountSummary } from "./AmountSummary.js";

const meta = {
  title: "Dados/Resumo de valores",
  component: AmountSummary,
  args: {
    label: "Resumo do item",
    items: [
      { label: "Subtotal", value: "R$ 200,00" },
      { label: "Descontos", value: "−R$ 22,00" },
      { label: "Impostos", value: "+R$ 8,90" },
    ],
    totalLabel: "Total do item",
    total: "R$ 186,90",
  },
} satisfies Meta<typeof AmountSummary>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Item: Story = {};
export const Negocio: Story = { args: { label: "Resumo do negócio", totalLabel: "Valor do negócio" } };
export const Incompleto: Story = { args: { items: [{ label: "Subtotal", value: "—" }, { label: "Descontos", value: "—" }, { label: "Impostos", value: "—" }], total: "—" } };
