import type { Meta, StoryObj } from "@storybook/react-vite";
import { PageHeader } from "../PageHeader/PageHeader.js";
import { PageFrame } from "./PageFrame.js";

const meta: Meta<typeof PageFrame> = { title: "Estrutura/Área de trabalho", component: PageFrame };
export default meta;
type Story = StoryObj<typeof PageFrame>;
export const ConteudoCentralizado: Story = { render: () => <PageFrame width="content"><PageHeader eyebrow="Administração" title="Usuários" description="Gerencie as pessoas com acesso ao sistema." /></PageFrame> };
export const ListaLarga: Story = { render: () => <PageFrame><PageHeader icon="user" title="Pessoas" /><p>Conteúdo da lista</p></PageFrame> };
