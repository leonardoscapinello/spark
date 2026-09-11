import type { Meta, StoryObj } from "@storybook/react-vite";
import { Select } from "./Select.js";

const meta: Meta<typeof Select> = { title: "Componentes/Select", component: Select };
export default meta;
type Story = StoryObj<typeof Select>;
export const Default: Story = { render: () => (<Select label="Equipe" options={[{value:"sales",label:"Vendas"},{value:"support",label:"Atendimento"}]} />) };
