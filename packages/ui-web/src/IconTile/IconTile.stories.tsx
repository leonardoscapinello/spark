import type { Meta, StoryObj } from "@storybook/react-vite";
import { Fileira, Matriz, Prancha, Secao } from "../storybook/Prancha.js";
import { IconTile } from "./IconTile.js";

const meta: Meta<typeof IconTile> = {
  title: "Superfícies/Disco de ícone",
  component: IconTile,
  args: { icon: "search", size: "md", tone: "neutral", surface: "cavado" },
  argTypes: { size: { control: "inline-radio", options: ["sm", "md", "lg", "xl"] }, tone: { control: "select", options: ["neutral", "muted", "success", "warning", "danger", "info"] }, surface: { control: "inline-radio", options: ["cavado", "folha"] } },
};
export default meta;
type Story = StoryObj<typeof IconTile>;

const TONS = ["neutral", "muted", "success", "warning", "danger", "info"] as const;
const TAMANHOS = [["sm", "28 · alerta"], ["md", "40 · lista e envio"], ["lg", "44 · estado de página"], ["xl", "48 · estado vazio"]] as const;

export const Interativo: Story = {};

export const Variantes: Story = { render: () => <Prancha>
  <Secao titulo="Tamanho × tom" descricao="Squircle de raio igual à metade da altura. Cor só quando o estado significa algo.">
    <Matriz colunas={TONS.map((tone) => tone)} linhas={TAMANHOS.map(([size, rotulo]) => ({ rotulo, celulas: TONS.map((tone) => <IconTile icon={tone === "success" ? "check" : tone === "danger" ? "alert" : tone === "warning" ? "warn" : tone === "info" ? "info" : "plug"} size={size} tone={tone} />) }))} />
  </Secao>
  <Secao titulo="Superfície">
    <Fileira rotulo="Cavado (repouso)"><IconTile icon="search" /><IconTile icon="lock" size="lg" /></Fileira>
    <Fileira rotulo="Folha (convida ao toque)"><IconTile icon="upload" surface="folha" /><IconTile icon="mail" surface="folha" size="xl" /></Fileira>
  </Secao>
</Prancha> };
