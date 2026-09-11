import type { Meta, StoryObj } from "@storybook/react-vite";
import { Accordion } from "./Accordion.js";

const meta: Meta<typeof Accordion> = { title: "Componentes/Accordion", component: Accordion };
export default meta;
type Story = StoryObj<typeof Accordion>;
export const Default: Story = { render: () => (<Accordion items={[{value:"user",title:"Dados do usuário",content:"Informações do contato"},{value:"notes",title:"Notas",content:"Histórico de notas"}]} />) };
