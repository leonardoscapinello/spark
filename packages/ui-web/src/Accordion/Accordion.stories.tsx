import type { Meta, StoryObj } from "@storybook/react-vite";
import { Fileira, Mesa, Prancha, Secao } from "../storybook/Prancha.js";
import { Accordion, type AccordionItem } from "./Accordion.js";

const ITENS: AccordionItem[] = [
  { value: "dados", title: "Dados do negócio", content: "Valor, previsão de fechamento e origem." },
  { value: "contato", title: "Contato", content: "Pessoa e empresa vinculadas.", badge: { level: "required", count: 2, label: "2 campos obrigatórios em branco" } },
  { value: "extra", title: "Campos personalizados", content: "Plano, renovação e segmento.", badge: { level: "important", count: 1, label: "1 campo importante em branco" } },
  { value: "bloqueado", title: "Contrato", content: "Disponível depois da proposta.", disabled: true },
];

const meta: Meta<typeof Accordion> = { title: "Estrutura/Acordeão", component: Accordion, args: { items: ITENS, multiple: true } };
export default meta;
type Story = StoryObj<typeof Accordion>;

export const Interativo: Story = { render: (args) => <Mesa largura={420}><Accordion {...args} /></Mesa> };
export const Compacto: Story = { args: { density: "compact", defaultValue: ["dados"] } };
export const Variantes: Story = { render: () => <Prancha><Secao titulo="Estados" descricao="Marca de campos em branco na aba fechada: obrigatório e importante.">
  <Fileira rotulo="Fechado" topo><Mesa largura={420}><Accordion items={ITENS} /></Mesa></Fileira>
  <Fileira rotulo="Aberto" topo><Mesa largura={420}><Accordion items={ITENS} defaultValue={["dados"]} /></Mesa></Fileira>
</Secao></Prancha> };
export const MuitosItens: Story = { render: () => <Mesa largura={420}><Accordion items={Array.from({ length: 10 }, (_, index) => ({ value: `secao-${index}`, title: `Seção ${index + 1}`, content: "Conteúdo da seção." }))} /></Mesa> };
export const TituloLongo: Story = { render: () => <Mesa largura={260}><Accordion items={[{ value: "longo", title: "Informações complementares do cadastro da empresa na Receita Federal", content: "Conteúdo." }]} /></Mesa> };
