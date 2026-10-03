import type { Meta, StoryObj } from "@storybook/react-vite";
import { Icon } from "../Icon/Icon.js";
import { Fileira, Mesa, Prancha, Secao } from "../storybook/Prancha.js";
import { ActionList } from "./ActionList.js";

const STAGES = [
  { id: "contato", label: "Contato feito", dot: "var(--v2)", trailingIcon: "chevronLeft" as const, ariaLabel: "Retornar: Contato feito" },
  { id: "qualificado", label: "Qualificado", dot: "var(--v1)", current: true },
  { id: "proposta", label: "Proposta enviada", dot: "var(--v4)", ariaLabel: "Avançar: Proposta enviada" },
  { id: "negociacao", label: "Negociação", dot: "var(--v3)", ariaLabel: "Avançar: Negociação" },
];

const meta: Meta<typeof ActionList> = { title: "Escolhas/Lista de escolhas", component: ActionList, args: { label: "Mover negócio", items: STAGES, onSelect: () => undefined } };
export default meta;
type Story = StoryObj<typeof ActionList>;

export const Interativo: Story = { render: (args) => <Mesa largura={300}><ActionList {...args} /></Mesa> };

export const Variantes: Story = {
  render: () => <Prancha><Secao titulo="Linhas" descricao="40 de altura, texto à esquerda, ponto 8 e seta 14 na ponta; a atual é folha pousada.">
    <Fileira rotulo="Com ponto" topo><Mesa largura={300}><ActionList label="Etapas" items={STAGES} onSelect={() => undefined} /></Mesa></Fileira>
    <Fileira rotulo="Com ícone" topo><Mesa largura={300}><ActionList label="Ações" items={[{ id: "dup", label: "Duplicar", icon: <Icon name="copy" /> }, { id: "exp", label: "Exportar CSV", icon: <Icon name="download" /> }, { id: "arq", label: "Arquivar", icon: <Icon name="folder" />, disabled: true }]} onSelect={() => undefined} /></Mesa></Fileira>
    <Fileira rotulo="Texto longo" topo><Mesa largura={220}><ActionList label="Etapas" items={[{ id: "a", label: "Validação jurídica e comercial do contrato", dot: "var(--v2)" }, { id: "b", label: "Assinatura", dot: "var(--v1)", current: true }]} onSelect={() => undefined} /></Mesa></Fileira>
    <Fileira rotulo="Um item" topo><Mesa largura={300}><ActionList label="Etapas" items={[{ id: "a", label: "Entrada", dot: "var(--tx3)", current: true }]} onSelect={() => undefined} /></Mesa></Fileira>
  </Secao></Prancha>,
};

export const MuitosItens: Story = { render: () => <Mesa largura={300}><ActionList label="Etapas" items={Array.from({ length: 12 }, (_, index) => ({ id: String(index), label: `Etapa ${index + 1}`, dot: `var(--v${(index % 4) + 1})`, current: index === 4 }))} onSelect={() => undefined} /></Mesa> };
