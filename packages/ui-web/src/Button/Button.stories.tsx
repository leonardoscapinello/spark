import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "./Button.js";

const meta: Meta<typeof Button> = {
  title: "Button",
  component: Button,
  args: { children: "Salvar" },
};
export default meta;

type Story = StoryObj<typeof Button>;

export const Primary: Story = { args: { variant: "primary" } };
export const Secondary: Story = { args: { variant: "secondary" } };
export const Ghost: Story = { args: { variant: "ghost" } };
export const Small: Story = { args: { size: "sm" } };
export const Large: Story = { args: { size: "lg" } };
export const Loading: Story = { args: { loading: true } };
export const Disabled: Story = { args: { disabled: true } };
