import type { Meta, StoryObj } from "@storybook/react-vite";
import { Alert } from "./Feedback.js";

const meta: Meta<typeof Alert> = { title: "Componentes/Feedback", component: Alert };
export default meta;
type Story = StoryObj<typeof Alert>;
export const Default: Story = { render: () => (<Alert title="Alterações salvas" />) };
