import type { Meta, StoryObj } from "@storybook/react-vite";
import { PreviewLink } from "./LinkPreview.js";
const meta = { title: "Dados/Prévia de link", component: PreviewLink } satisfies Meta<typeof PreviewLink>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Pronta: Story = { args: { href: "https://example.com", children: "Abrir exemplo", preview: { url: "https://example.com", title: "Página de exemplo", description: "Uma descrição curta da página que será aberta.", imageUrl: null, faviconUrl: null, siteName: "Example", status: "ready" } } };
export const Carregando: Story = { args: { href: "https://example.com", children: "Carregando prévia", loading: true } };
