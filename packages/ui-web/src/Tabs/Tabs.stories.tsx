import type { Meta, StoryObj } from "@storybook/react-vite";
import { Fileira, Mesa, Prancha, Secao } from "../storybook/Prancha.js";
import { Tabs, type TabItem } from "./Tabs.js";

const ITENS: readonly TabItem[] = [
  { value: "resumo", label: "Resumo", content: "Valor, etapa, responsável e próximos passos." },
  { value: "atividades", label: "Atividades", content: "Tarefas e reuniões do negócio." },
  { value: "arquivos", label: "Arquivos", content: "Propostas e contratos anexados." },
  { value: "historico", label: "Histórico", content: "Cada mudança, com quem e quando." },
];

const meta = {
  title: "Navegação/Abas",
  component: Tabs,
  args: { label: "Seções do negócio", items: ITENS, variant: "underline", defaultValue: "resumo" },
  argTypes: { variant: { control: "inline-radio", options: ["underline", "segmented"] }, items: { control: false } },
  parameters: {
    docs: { description: { component: "Abas de conteúdo na mesma tela. Sublinhadas: o traço desliza até a aba ativa em 550 ms. Segmentadas: a folha desliza, como no controle segmentado. Para navegar entre páginas, use Abas com link." } },
  },
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Interativo: Story = {};
export const Ficha: Story = { args: { variant: "segmented", items: ITENS.map(item => ({ ...item, ...(item.value === "atividades" ? { count: 3 } : {}) })) } };

export const Variantes: Story = {
  render: () => (
    <Prancha>
      <Secao titulo="Sublinhadas e segmentadas" descricao="Clique entre as abas para ver o indicador deslizar.">
        <Fileira rotulo="underline" topo><Mesa largura={560}><Tabs label="Sublinhadas" items={ITENS} defaultValue="resumo" /></Mesa></Fileira>
        <Fileira rotulo="segmented" topo><Mesa largura={560}><Tabs label="Segmentadas" variant="segmented" items={ITENS.slice(0, 3)} defaultValue="atividades" /></Mesa></Fileira>
      </Secao>
      <Secao titulo="Aba indisponível">
        <Mesa largura={560}><Tabs label="Com aba indisponível" items={[...ITENS.slice(0, 3), { value: "integracoes", label: "Integrações", content: "", disabled: true }]} defaultValue="resumo" /></Mesa>
      </Secao>
      <Secao titulo="Muitas abas em largura estreita" descricao="A lista rola de lado; o rótulo nunca quebra.">
        <Mesa largura={320}><Tabs label="Estreitas" items={[...ITENS, { value: "produtos", label: "Produtos", content: "" }, { value: "campos", label: "Campos personalizados", content: "" }]} defaultValue="resumo" /></Mesa>
      </Secao>
    </Prancha>
  ),
};
