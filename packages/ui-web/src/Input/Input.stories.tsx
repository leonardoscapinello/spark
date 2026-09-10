import type { Meta, StoryObj } from "@storybook/react-vite";
import { Input } from "./Input.js";

const meta: Meta<typeof Input> = {
  title: "Input",
  component: Input,
  args: { placeholder: "nome@empresa.com", "aria-label": "E-mail" },
};
export default meta;

type Story = StoryObj<typeof Input>;

export const Default: Story = {};
export const Small: Story = { args: { size: "sm" } };
export const Large: Story = { args: { size: "lg" } };
export const Disabled: Story = { args: { disabled: true, value: "não editável" } };
export const ReadOnly: Story = { args: { readOnly: true, value: "somente leitura" } };
