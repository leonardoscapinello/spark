import type { Meta, StoryObj } from "@storybook/react-vite";
import { Sidebar } from "./Sidebar.js";
import { SidebarItem } from "./Sidebar.js";
const meta: Meta<typeof Sidebar> = { title: "Componentes/Sidebar", component: Sidebar };
export default meta;
type Story = StoryObj<typeof Sidebar>;
export const Default: Story = { render: () => (<Sidebar title="Atendimento"><SidebarItem href="#all" active count={4}>Todas</SidebarItem><SidebarItem href="#mine" count={0}>Minhas conversas</SidebarItem></Sidebar>) };
