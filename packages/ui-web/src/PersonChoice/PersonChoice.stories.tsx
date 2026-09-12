import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { PersonChoice } from "./PersonChoice.js";

const meta: Meta<typeof PersonChoice> = { title: "Componentes/PersonChoice", component: PersonChoice };
export default meta;
type Story = StoryObj<typeof PersonChoice>;

export const SelecionarPessoa: Story = {
  render: () => {
    const [selected, setSelected] = useState(false);
    return <div style={{ maxWidth: "var(--ui-cardMinWidth)" }}>
      <PersonChoice name="Maria Silva" detail="maria@exemplo.com" checked={selected} onCheckedChange={setSelected} />
    </div>;
  },
};
