import type { Meta, StoryObj } from "@storybook/react-vite";
import { Sidebar } from "./Sidebar.js";
import { SidebarItem, SidebarSection } from "./Sidebar.js";
const meta: Meta<typeof Sidebar> = { title: "Componentes/Sidebar", component: Sidebar };
export default meta;
type Story = StoryObj<typeof Sidebar>;
export const Default: Story = { render: () => (<Sidebar title="Atendimento"><SidebarItem href="#all" active count={4}>Todas</SidebarItem><SidebarItem href="#mine" count={0}>Minhas conversas</SidebarItem></Sidebar>) };
export const Configuracoes: Story = { render: () => (<Sidebar title="Configurações"><SidebarItem href="#inicio" active>Início</SidebarItem><SidebarSection title="Acesso" collapsible><SidebarItem href="#users">Usuários</SidebarItem><SidebarItem href="#teams">Times</SidebarItem><SidebarItem href="#groups">Grupos de permissões</SidebarItem></SidebarSection><SidebarSection title="Sistema" collapsible><SidebarItem href="#integrations">Integrações</SidebarItem><SidebarItem href="#audit">Auditoria</SidebarItem></SidebarSection></Sidebar>) };
