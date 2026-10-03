import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "../Button/Button.js";
import { Icon } from "../Icon/Icon.js";
import { Mesa, Prancha, Secao } from "../storybook/Prancha.js";
import { SectionTitle } from "./SectionTitle.js";

const meta = {
  title: "Estrutura/Título de seção",
  component: SectionTitle,
  args: { level: "card", children: "Receita diária", meta: "últimos 30 dias" },
  argTypes: { level: { control: "inline-radio", options: ["page", "section", "card", "block"] } },
  parameters: {
    docs: { description: { component: "Um título para cada nível, com ícone, meta, descrição e ações sempre no mesmo lugar. A tela escolhe o nível; tamanho, peso e cor vêm daqui." } },
  },
} satisfies Meta<typeof SectionTitle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Interativo: Story = {};

export const Niveis: Story = {
  name: "Níveis",
  render: () => (
    <Prancha>
      <Secao titulo="Do maior ao menor">
        <Mesa largura={720}>
          <SectionTitle level="page" icon={<Icon name="briefcase" />} actions={<Button>Novo negócio</Button>}>Funil comercial</SectionTitle>
          <SectionTitle level="section" meta="09 — Movimento" description="Um gesto, sem hesitação, que desacelera ao pousar.">Movimento</SectionTitle>
          <SectionTitle level="card" meta="últimos 30 dias" actions={<Button variant="ghost" size="sm" iconOnly icon={<Icon name="more" />} aria-label="Mais opções" />}>Receita diária</SectionTitle>
          <SectionTitle level="block" icon={<Icon name="file" />}>Detalhes</SectionTitle>
        </Mesa>
      </Secao>
      <Secao titulo="Título longo em largura estreita">
        <Mesa largura={280}>
          <SectionTitle level="card" meta="atualizado agora" actions={<Button variant="secondary" size="sm">Ver tudo</Button>}>Negócios parados há mais de trinta dias na etapa de proposta</SectionTitle>
        </Mesa>
      </Secao>
    </Prancha>
  ),
};
