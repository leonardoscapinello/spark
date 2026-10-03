import type { Meta, StoryObj } from "@storybook/react-vite";
import { Fileira, Matriz, Mesa, Prancha, Secao } from "../storybook/Prancha.js";
import { Chip, type ChipTone } from "./Chip.js";

const meta: Meta<typeof Chip> = {
  title: "Dados/Etiqueta",
  component: Chip,
  args: { children: "Rascunho", tone: "neutral", size: "md", dot: false },
  argTypes: { tone: { control: "select", options: ["neutral", "success", "warning", "danger", "info", "ink"] }, size: { control: "inline-radio", options: ["sm", "md"] }, dot: { control: "text" } },
};
export default meta;
type Story = StoryObj<typeof Chip>;

const TONS: readonly { tone: ChipTone; rotulo: string; texto: string }[] = [
  { tone: "neutral", rotulo: "Neutra", texto: "Rascunho" },
  { tone: "success", rotulo: "Sucesso", texto: "Aprovado" },
  { tone: "warning", rotulo: "Atenção", texto: "Pendente" },
  { tone: "danger", rotulo: "Erro", texto: "Reembolsado" },
  { tone: "info", rotulo: "Informação", texto: "Obrigatório" },
  { tone: "ink", rotulo: "Tinta", texto: "Novo" },
];

export const Interativo: Story = {};

export const Variantes: Story = { render: () => <Prancha>
  <Secao titulo="Tom × forma" descricao="Cor de estado só quando significa, sempre com o fundo suave. A cor da etiqueta mora no ponto.">
    <Matriz colunas={["Sem ponto", "Com ponto", "Pequena (20)", "Com ícone"]} linhas={TONS.map(({ tone, rotulo, texto }) => ({ rotulo, celulas: [<Chip tone={tone}>{texto}</Chip>, <Chip tone={tone} dot>{texto}</Chip>, <Chip tone={tone} size="sm" dot>{texto}</Chip>, <Chip tone={tone} icon="tag">{texto}</Chip>] }))} />
  </Secao>
  <Secao titulo="Etapa e status em lista" descricao="Etiqueta neutra com ponto de 6px na cor da etapa — o antigo selo colorido de etapa.">
    <Fileira rotulo="Etapas de lead"><Chip dot="var(--in)">Novo</Chip><Chip dot="var(--ok)">Qualificado</Chip><Chip dot="var(--wa)">Em nutrição</Chip><Chip dot="var(--tx)">Cliente</Chip><Chip dot="var(--er)">Desqualificado</Chip></Fileira>
    <Fileira rotulo="Cor do dado"><Chip dot="var(--v1)">Proposta</Chip><Chip dot="var(--v2)">Negociação</Chip><Chip dot="var(--v3)">Contrato</Chip><Chip dot="#06BFF5">Etapa com cor própria</Chip></Fileira>
  </Secao>
  <Secao titulo="Antigo selo (Badge)" descricao="Todos os usos do Badge agora desenhados pelo Chip.">
    <Fileira rotulo="Situações"><Chip>Aberto</Chip><Chip tone="success" dot>Conectado</Chip><Chip tone="warning" dot>Pendente</Chip><Chip tone="danger" dot>Falha</Chip><Chip tone="info">Obrigatório</Chip><Chip>Só eu</Chip><Chip tone="ink">Novo</Chip></Fileira>
  </Secao>
  <Secao titulo="Antiga etiqueta (Tag)" descricao="Etiqueta com ícone e etiqueta removível.">
    <Fileira rotulo="Com ícone"><Chip icon="tag">Prioridade</Chip><Chip icon="bolt">Formulário enviado</Chip></Fileira>
    <Fileira rotulo="Removível"><Chip onRemove={() => undefined} removeLabel="Remover etiqueta VIP">VIP</Chip><Chip dot="var(--v4)" onRemove={() => undefined} removeLabel="Remover etiqueta Evento">Evento</Chip></Fileira>
  </Secao>
</Prancha> };

export const TextoLongo: Story = { render: () => <Mesa largura={160}><Chip dot="var(--ok)">Qualificado pelo time de pré-vendas da regional sul</Chip></Mesa> };
export const MuitasEtiquetas: Story = { render: () => <Mesa largura={320}><div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{["VIP", "Evento", "Indicação", "Black Friday", "Renovação", "Parceiro", "Inbound", "Outbound", "Webinar", "Trial"].map((tag) => <Chip key={tag} onRemove={() => undefined} removeLabel={`Remover etiqueta ${tag}`}>{tag}</Chip>)}</div></Mesa> };
