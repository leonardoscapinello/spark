import type { Meta, StoryObj } from "@storybook/react-vite";
import { Icon } from "./Icon.js";

const meta: Meta<typeof Icon> = { title: "Componentes/Icon", component: Icon };
export default meta;
type Story = StoryObj<typeof Icon>;
export const Default: Story = { render: () => (<Icon name="inbox" />) };
export const Navigation: Story = { render: () => <div style={{ display: "flex", gap: "var(--space-4)", alignItems: "center" }}><Icon name="user" aria-label="Leads" /><Icon name="settings" aria-label="Administração" /><Icon name="account" aria-label="Minha conta" /><Icon name="image" aria-label="Imagem" /><Icon name="text" aria-label="Texto" /></div> };
export const Actions: Story = { render: () => <div style={{ display: "flex", gap: "var(--space-4)", alignItems: "center" }}><Icon name="more" aria-label="Mais ações" /><Icon name="menu" aria-label="Visualização em lista" /></div> };
export const Marketing: Story = { render: () => <div style={{ display: "flex", gap: "var(--space-4)", alignItems: "center" }}><Icon name="mail" aria-label="Campanhas" /><Icon name="page" aria-label="Páginas" /><Icon name="form" aria-label="Formulários" /><Icon name="folder" aria-label="Arquivos" /></div> };
