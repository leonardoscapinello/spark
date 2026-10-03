import type { Meta, StoryObj } from "@storybook/react-vite";
import { Fileira, Mesa, Prancha, Secao } from "../storybook/Prancha.js";
import { ThemePreview, type ThemePreviewColors } from "./ThemePreview.js";

const PAPEL: ThemePreviewColors = { accent: "#1d1b18", accentStrong: "#34312c", ground: "#f6f4ef", surface: "#fffefb", ink: "#1d1b18", muted: "#67625a", line: "#e7e3da" };
const CARVAO: ThemePreviewColors = { accent: "#f3efe6", accentStrong: "#ffffff", ground: "#161411", surface: "#1f1c18", ink: "#f6f1e4", muted: "#b3a98f", line: "#2d2923" };
const MARCA: ThemePreviewColors = { accent: "#3c64c8", accentStrong: "#2a4a99", ground: "#f4f6fb", surface: "#ffffff", ink: "#1b2333", muted: "#5b6478", line: "#dfe4ee" };

const meta: Meta<typeof ThemePreview> = { title: "Padrões/Prévia de aparência", component: ThemePreview, args: { colors: PAPEL, fontBody: "var(--font)", fontDisplay: "var(--font-display)" } };
export default meta;
type Story = StoryObj<typeof ThemePreview>;

export const Interativo: Story = { render: (args) => <Mesa largura={384}><ThemePreview {...args} /></Mesa> };
export const Variantes: Story = { render: () => <Prancha><Secao titulo="Rascunhos" descricao="O recorte do produto pintado com as cores e fontes escolhidas.">
  <Fileira rotulo="Papel" topo><Mesa largura={340}><ThemePreview colors={PAPEL} fontBody="var(--font)" fontDisplay="var(--font-display)" /></Mesa></Fileira>
  <Fileira rotulo="Carvão" topo><Mesa largura={340}><ThemePreview colors={CARVAO} fontBody="var(--font)" fontDisplay="var(--font-display)" /></Mesa></Fileira>
  <Fileira rotulo="Marca própria" topo><Mesa largura={340}><ThemePreview colors={MARCA} fontBody="var(--font)" fontDisplay="Georgia, serif" /></Mesa></Fileira>
</Secao></Prancha> };
export const Estreito: Story = { render: () => <Mesa largura={260}><ThemePreview colors={PAPEL} fontBody="var(--font)" fontDisplay="var(--font-display)" /></Mesa> };
