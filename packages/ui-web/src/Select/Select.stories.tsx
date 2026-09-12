import type { Meta, StoryObj } from "@storybook/react-vite";
import { Select } from "./Select.js";

const meta: Meta<typeof Select> = { title: "Componentes/Select", component: Select };
export default meta;
type Story = StoryObj<typeof Select>;
export const Default: Story = { render: () => (<Select label="Equipe" options={[{value:"sales",label:"Vendas"},{value:"support",label:"Atendimento"}]} />) };
export const FiltroCompacto: Story = { render: () => (<Select appearance="filter" label="Filtrar por etapa" defaultValue="all" options={[{value:"all",label:"Todas as etapas"},{value:"new",label:"Novos leads"},{value:"qualified",label:"Qualificados"}]} />) };
