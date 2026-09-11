import type { Meta, StoryObj } from "@storybook/react-vite";
import { Switch } from "./Switch.js";

const meta: Meta<typeof Switch> = { title: "Componentes/Switch", component: Switch };
export default meta;
type Story = StoryObj<typeof Switch>;
export const Default: Story = { render: () => (<Switch>Ativar notificações</Switch>) };
