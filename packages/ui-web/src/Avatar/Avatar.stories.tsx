import type { Meta as StoryMeta, StoryObj } from "@storybook/react-vite";
import { Avatar } from "./Avatar.js";

const meta: StoryMeta<typeof Avatar> = { title: "Fundamentos/Avatar", component: Avatar, args: { name: "Maria Oliveira" } };
export default meta;
type Story = StoryObj<typeof Avatar>;
export const Medio: Story = {};
export const Pequeno: Story = { args: { size: "small" } };
export const Grande: Story = { args: { size: "large" } };
