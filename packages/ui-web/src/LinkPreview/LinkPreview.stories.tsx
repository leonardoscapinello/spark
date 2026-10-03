import type { Meta, StoryObj } from "@storybook/react-vite";
import { Fileira, Matriz, Prancha, Secao } from "../storybook/Prancha.js";
import { LinkPreviewCard, PreviewLink, type LinkPreviewData } from "./LinkPreview.js";

const meta = { title: "Dados/Prévia de link", component: PreviewLink } satisfies Meta<typeof PreviewLink>;
export default meta;
type Story = StoryObj<typeof meta>;

const pronta: LinkPreviewData = { url: "https://example.com", title: "Página de exemplo", description: "Uma descrição curta da página que será aberta.", imageUrl: null, faviconUrl: null, siteName: "Example", status: "ready" };
const comImagem: LinkPreviewData = { ...pronta, url: "https://example.com/materia", title: "Uma matéria com miniatura proporcional", description: "A imagem mantém a proporção 16:9 e o texto ocupa uma área compacta abaixo dela.", imageUrl: "https://picsum.photos/640/360" };
const longa: LinkPreviewData = { ...pronta, title: "Um título muito longo que não cabe numa linha só e precisa cortar com reticências no fim", description: "Uma descrição comprida o bastante para passar de três linhas: o cartão corta no limite e mantém a altura, sem empurrar a dica para fora da tela nem quebrar a proporção da imagem lá em cima.", siteName: "Um site com um nome comprido demais" };
const falhou: LinkPreviewData = { ...pronta, status: "failed" };

/** Passe o ponteiro no link: a dica abre com a prévia. Ajuste a prévia nos controles. */
export const Interativo: Story = { args: { href: "https://example.com", children: "Abrir exemplo", preview: pronta } };

/** Todos os estados do cartão lado a lado. */
export const Variantes: Story = {
  args: { href: "https://example.com", children: "Exemplo" },
  render: () => <Prancha>
    <Secao titulo="Cartão de prévia" descricao="O mesmo cartão para carregando, pronto e indisponível — a forma não muda no meio da espera.">
      <Matriz colunas={["Pronta", "Com miniatura", "Carregando", "Indisponível"]} linhas={[
        { rotulo: "Cartão", celulas: [<LinkPreviewCard key="p" preview={pronta} />, <LinkPreviewCard key="m" preview={comImagem} />, <LinkPreviewCard key="c" loading url="https://example.com" />, <LinkPreviewCard key="f" preview={falhou} />] },
      ]} />
    </Secao>
    <Secao titulo="Texto longo">
      <Fileira rotulo="Título e descrição cortam"><LinkPreviewCard preview={longa} /></Fileira>
    </Secao>
  </Prancha>,
};

export const Carregando: Story = { args: { href: "https://example.com", children: "Carregando prévia", loading: true } };
export const Indisponivel: Story = { name: "Indisponível", args: { href: "https://example.com", children: "Link sem prévia", preview: falhou } };
export const TextoLongo: Story = { name: "Texto longo", args: { href: "https://example.com", children: "Abrir página", preview: longa } };
export const FaviconGrande: Story = { name: "Favicon grande", args: { href: "https://example.com", children: "Favicon limitado a 16px", preview: { ...pronta, title: "Título ao lado de um favicon discreto", description: "A imagem original tem 512px, mas o ícone respeita o tamanho do texto.", faviconUrl: "https://picsum.photos/512/512" } } };
