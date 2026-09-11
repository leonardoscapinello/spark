import type { Meta, StoryObj } from "@storybook/react-vite";
import { SearchSelect } from "./SearchSelect.js";

const meta: Meta<typeof SearchSelect> = { title: "Componentes/SearchSelect", component: SearchSelect };
export default meta;
type Story = StoryObj<typeof SearchSelect>;
export const Default: Story = { render: () => (<SearchSelect label="Pesquisar equipe" options={[{value:"sales",label:"Vendas"},{value:"support",label:"Atendimento"}]} />) };

export const ComFotoEBusca:Story={args:{label:"Colaborador",searchPlacement:"dropdown",options:[{value:"m",label:"Maria Oliveira",description:"Atendimento",avatar:"https://i.pravatar.cc/80?img=47"},{value:"a",label:"Ana Costa",description:"Vendas",avatar:null}]}};
