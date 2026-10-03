import type { Meta, StoryObj } from "@storybook/react-vite";
import { ScoreGauge } from "./ScoreGauge.js";

const meta: Meta<typeof ScoreGauge> = { title: "Dados/Score", component: ScoreGauge, args: { value: 700 } };
export default meta;
type Story = StoryObj<typeof ScoreGauge>;
export const SemHistorico: Story = {};
export const Crescendo: Story = { args: { previousValue: 620 } };
export const Diminuindo: Story = { args: { previousValue: 750 } };
export const Estavel: Story = { args: { previousValue: 700 } };
export const Zero: Story = { args: { value: 0, previousValue: 10 } };
export const Maximo: Story = { args: { value: 1000, previousValue: 800 } };
