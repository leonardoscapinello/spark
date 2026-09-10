import type { Meta, StoryObj } from "@storybook/react-vite";
import { Glass } from "./Glass.js";

const meta: Meta<typeof Glass> = {
  title: "Glass",
  component: Glass,
  parameters: {
    // fundo com gradiente para o vidro ter o que refratar — sem isso a
    // superfície parece só uma caixa cinza (docs/adr/0025).
    backgrounds: { default: "gradient" },
  },
  decorators: [
    (Story) => (
      <div
        style={{
          padding: 48,
          minHeight: 200,
          background:
            "linear-gradient(135deg, var(--color-sage-400), var(--color-slate-400))",
          display: "grid",
          placeItems: "center",
        }}
      >
        <Story />
      </div>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof Glass>;

export const Default: Story = {
  args: { children: "Barra de navegação flutuante" },
  render: (args) => (
    <Glass {...args} style={{ padding: "12px 24px" }} />
  ),
};

export const ComoNav: Story = {
  render: () => (
    <Glass as="nav" style={{ padding: "12px 24px" }}>
      Sidebar / topbar — a única superfície com vidro (ADR-0025)
    </Glass>
  ),
};
