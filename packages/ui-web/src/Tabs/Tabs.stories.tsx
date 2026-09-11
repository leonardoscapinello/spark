import type { Meta, StoryObj } from "@storybook/react-vite";
import { Tabs } from "./Tabs.js";

const meta: Meta<typeof Tabs> = { title: "Componentes/Tabs", component: Tabs };
export default meta;
type Story = StoryObj<typeof Tabs>;
export const Default: Story = { render: () => (<Tabs label="Painel" items={[{value:"details",label:"Detalhes",content:"Detalhes do contato"},{value:"copilot",label:"Copiloto",content:"Assistente"}]} />) };
