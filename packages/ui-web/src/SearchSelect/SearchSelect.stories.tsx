import type { Meta, StoryObj } from "@storybook/react-vite";
import { SearchSelect } from "./SearchSelect.js";

const meta: Meta<typeof SearchSelect> = { title: "Componentes/SearchSelect", component: SearchSelect };
export default meta;
type Story = StoryObj<typeof SearchSelect>;
export const Default: Story = { render: () => (<SearchSelect label="Pesquisar equipe" options={[{value:"sales",label:"Vendas"},{value:"support",label:"Atendimento"}]} />) };
