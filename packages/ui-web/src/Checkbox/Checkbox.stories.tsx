import type { Meta, StoryObj } from "@storybook/react-vite";
import { Checkbox } from "./Checkbox.js";

const meta: Meta<typeof Checkbox> = { title: "Componentes/Checkbox", component: Checkbox };
export default meta;
type Story = StoryObj<typeof Checkbox>;
export const Default: Story = { render: () => (<Checkbox>Selecionar conversa</Checkbox>) };
