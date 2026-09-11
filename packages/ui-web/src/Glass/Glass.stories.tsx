import type { Meta, StoryObj } from "@storybook/react-vite";
import { Glass } from "./Glass.js";

const meta: Meta<typeof Glass> = {
  title: "Glass",
  component: Glass,
  parameters: {
    // gradient background so the glass has something to refract — without
    // it the surface just looks like a grey box (docs/adr/0025).
    backgrounds: { default: "gradient" },
  },
  decorators: [
    (Story) => (
      <div
        style={{
          padding: 48,
          minHeight: 200,
          background: "linear-gradient(135deg, var(--color-void), var(--color-blue-600))",
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

export const Panel: Story = {
  args: { children: "Floating navigation bar", tier: "panel" },
  render: (args) => <Glass {...args} style={{ padding: "12px 24px" }} />,
};

export const Subtle: Story = {
  render: () => (
    <Glass tier="subtle" style={{ padding: "6px 14px" }}>
      Chip / tag
    </Glass>
  ),
};

export const Modal: Story = {
  render: () => (
    <Glass tier="modal" style={{ padding: "24px 32px" }}>
      Modal / confirmation
    </Glass>
  ),
};

export const AsNav: Story = {
  render: () => (
    <Glass as="nav" style={{ padding: "12px 24px" }}>
      Sidebar / topbar — the floating nav layer (ADR-0025)
    </Glass>
  ),
};
