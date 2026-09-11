import type { Meta, StoryObj } from "@storybook/react-vite";
import { Popover } from "./Popover.js";
import { PopoverTrigger, PopoverContent } from "./Popover.js";
import { Button } from "../Button/Button.js";
import { Input } from "../Input/Input.js";
const meta: Meta<typeof Popover> = { title: "Componentes/Popover", component: Popover };
export default meta;
type Story = StoryObj<typeof Popover>;
export const Default: Story = { render: () => (<Popover><PopoverTrigger render={<Button>Abrir filtro</Button>} /><PopoverContent title="Filtros"><Input aria-label="Pesquisar" /></PopoverContent></Popover>) };
