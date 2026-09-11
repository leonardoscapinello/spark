import type { Meta, StoryObj } from "@storybook/react-vite";
import { Textarea } from "./Textarea.js";

const meta: Meta<typeof Textarea> = { title: "Componentes/Textarea", component: Textarea };
export default meta;
type Story = StoryObj<typeof Textarea>;
export const Default: Story = { render: () => (<Textarea aria-label="Observações" placeholder="Escreva aqui" />) };
