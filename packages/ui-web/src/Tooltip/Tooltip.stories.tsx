import type { Meta, StoryObj } from "@storybook/react-vite";
import { Tooltip } from "./Tooltip.js";
import { TooltipProvider } from "./Tooltip.js";
import { Button } from "../Button/Button.js";
const meta: Meta<typeof Tooltip> = { title: "Componentes/Tooltip", component: Tooltip };
export default meta;
type Story = StoryObj<typeof Tooltip>;
export const Default: Story = { render: () => (<TooltipProvider><Tooltip content="Mais informações"><Button>Ajuda</Button></Tooltip></TooltipProvider>) };
