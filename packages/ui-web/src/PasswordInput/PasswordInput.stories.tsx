import type { Meta, StoryObj } from "@storybook/react-vite";
import { PasswordInput } from "./PasswordInput.js";

const meta: Meta<typeof PasswordInput> = { title: "Componentes/PasswordInput", component: PasswordInput };
export default meta;
type Story = StoryObj<typeof PasswordInput>;
export const Default: Story = { render: () => (<PasswordInput aria-label="Senha" placeholder="Digite sua senha" />) };
