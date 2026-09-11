import type { Meta, StoryObj } from "@storybook/react-vite";
import { DropdownButton } from "./Menu.js";
import { MenuItem } from "./Menu.js";
import { Button } from "../Button/Button.js";
const meta: Meta<typeof DropdownButton> = { title: "Componentes/Menu", component: DropdownButton };
export default meta;
type Story = StoryObj<typeof DropdownButton>;
export const Default: Story = { render: () => (<DropdownButton trigger={<Button>Mais opções</Button>}><MenuItem onClick={() => undefined}>Abrir</MenuItem><MenuItem disabled>Indisponível</MenuItem></DropdownButton>) };
