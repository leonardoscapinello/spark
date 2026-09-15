import type { Meta, StoryObj } from "@storybook/react-vite";
import { PreviewLink } from "./LinkPreview.js";
const meta = { title: "Dados/Prévia de link", component: PreviewLink } satisfies Meta<typeof PreviewLink>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Pronta: Story = { args: { href: "https://example.com", children: "Abrir exemplo", preview: { url: "https://example.com", title: "Página de exemplo", description: "Uma descrição curta da página que será aberta.", imageUrl: null, faviconUrl: null, siteName: "Example", status: "ready" } } };
export const ComMiniatura: Story = { args: { href: "https://example.com", children: "Abrir matéria", preview: { url: "https://example.com/materia", title: "Uma matéria com miniatura proporcional", description: "A imagem mantém a proporção 16:9 e o texto ocupa uma área compacta abaixo dela.", imageUrl: "https://picsum.photos/640/360", faviconUrl: null, siteName: "Example", status: "ready" } } };
export const Carregando: Story = { args: { href: "https://example.com", children: "Carregando prévia", loading: true } };
export const FaviconGrande: Story = { args: { href: "https://example.com", children: "Favicon limitado a 16px", preview: { url: "https://example.com", title: "Título ao lado de um favicon discreto", description: "A imagem original tem 512px, mas o ícone respeita o tamanho do texto.", imageUrl: null, faviconUrl: "https://picsum.photos/512/512", siteName: "Example", status: "ready" } } };
