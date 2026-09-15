import type { Meta, StoryObj } from "@storybook/react-vite";
import { SlaProgress } from "./SlaProgress.js";
const meta = { title: "CRM/Progresso de SLA", component: SlaProgress } satisfies Meta<typeof SlaProgress>;
export default meta;
type Story = StoryObj<typeof meta>;
export const NoPrazo: Story = { args: { percent: 42, label: "SLA 42% · 2 h restantes", state: "on_track" } };
export const Vencido: Story = { args: { percent: 100, label: "SLA vencido", state: "breached" } };
