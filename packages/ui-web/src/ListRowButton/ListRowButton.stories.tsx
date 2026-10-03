import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "../Button/Button.js";
import { EmptyState } from "../EmptyState/EmptyState.js";
import { Icon } from "../Icon/Icon.js";
import { RowList } from "../ListRow/ListRow.js";
import { Matriz, Prancha, Secao } from "../storybook/Prancha.js";
import { ListRowButton } from "./ListRowButton.js";

const meta = {
  title: "Navegação/Linha de escolha",
  component: ListRowButton,
  args: {
    title: "Gatilho",
    description: "Define quando o fluxo começa",
    icon: "bolt",
    dot: "var(--v1)",
    selected: false,
    disabled: false,
  },
  argTypes: {
    icon: { control: "select", options: ["bolt", "play", "funnel", "clock", "star", "text", "image", "right", "minus"] },
    dot: { control: "select", options: ["var(--v1)", "var(--v2)", "var(--v3)", "var(--v4)"] },
    actions: { control: false },
    leading: { control: false },
  },
} satisfies Meta<typeof ListRowButton>;
export default meta;
type Story = StoryObj<typeof meta>;

/* Dados fixos das histórias. */
const ETAPAS = [
  { icon: "bolt", dot: "var(--v1)", title: "Gatilho", description: "Define quando o fluxo começa" },
  { icon: "play", dot: "var(--v2)", title: "Ação", description: "Executa uma tarefa" },
  { icon: "funnel", dot: "var(--v3)", title: "Condição", description: "Divide o caminho por uma regra" },
  { icon: "clock", dot: "var(--v4)", title: "Espera", description: "Aguarda um período ou evento" },
] as const;
const BLOCOS = ["Destaque", "Texto", "Imagem", "Botão", "Espaço"] as const;
const coluna = (largura = 380) => ({ width: largura, maxWidth: "100%", padding: 16, background: "var(--sf3)" });

function Acoes({ rotulo }: { rotulo: string }) {
  return <>
    <Button iconOnly size="sm" variant="ghost" icon={<Icon name="chevronUp" />} aria-label={`Subir ${rotulo}`} />
    <Button iconOnly size="sm" variant="ghost" icon={<Icon name="chevronDown" />} aria-label={`Descer ${rotulo}`} />
    <Button iconOnly size="sm" variant="ghost" icon={<Icon name="trash" />} aria-label={`Remover ${rotulo}`} />
  </>;
}

/** Mude título, apoio, ícone, ponto, seleção e desabilitado pelos controles. */
export const Interativo: Story = {
  render: (args) => <div style={coluna()}><RowList label="Etapas"><ListRowButton {...args} /></RowList></div>,
};

/** Folha de componentes: estado × composição. */
export const Variantes: Story = {
  render: () => <Prancha>
    <Secao titulo="Estado × composição" descricao="A aparência é a da ListRow: disco de 28 cavado, título 13/500, apoio 12, realce --acs no hover e folha --r-rico quando aberta. O ponto leva a cor do tipo; as ações ficam fora do botão.">
      <Matriz
        colunas={["Só título", "Com apoio", "Com ponto", "Com ações"]}
        linhas={([["Repouso", {}], ["Aberta", { selected: true }], ["Desabilitada", { disabled: true }]] as const).map(([rotulo, estado]) => ({
          rotulo,
          celulas: [
            <div style={coluna(260)}><RowList><ListRowButton icon="star" title="Destaque" {...estado} /></RowList></div>,
            <div style={coluna(260)}><RowList><ListRowButton icon="star" title="Destaque" description="Título, chamada e texto" {...estado} /></RowList></div>,
            <div style={coluna(260)}><RowList><ListRowButton icon="bolt" dot="var(--v1)" title="Gatilho" description="Define quando o fluxo começa" {...estado} /></RowList></div>,
            <div style={coluna(260)}><RowList><ListRowButton icon="text" title="Texto" description="Seção de conteúdo" actions={<Acoes rotulo="Texto" />} {...estado} /></RowList></div>,
          ],
        }))}
      />
    </Secao>
  </Prancha>,
};

/** Paleta de etapas: cada tipo com o seu ponto de pigmento, entrando em cascata. */
export const Paleta: Story = {
  render: () => <div style={coluna()}><RowList label="Etapas">{ETAPAS.map((etapa, indice) => <ListRowButton key={etapa.title} index={indice} {...etapa} />)}</RowList></div>,
};

/** Estrutura: a linha aberta vira folha; subir, descer e remover ficam à direita. */
export const EstruturaComAcoes: Story = {
  render: () => <div style={coluna()}><RowList label="Blocos da página">{BLOCOS.map((bloco, indice) => <ListRowButton key={bloco} index={indice} icon="page" title={bloco} description="Uma página feita para converter" selected={indice === 1} actions={<Acoes rotulo={bloco} />} />)}</RowList></div>,
};

/** Vazio: sem linhas, a lista dá lugar ao estado vazio do sistema. */
export const Vazio: Story = {
  render: () => <div style={coluna()}><EmptyState icon="page" title="Nenhum bloco ainda" description="Adicione o primeiro bloco na aba Blocos." action={<Button variant="secondary">Ver blocos</Button>} /></div>,
};

/** Desabilitado: quem só lê vê a paleta, sem poder escolher. */
export const Desabilitado: Story = {
  render: () => <div style={coluna()}><RowList label="Etapas">{ETAPAS.map((etapa, indice) => <ListRowButton key={etapa.title} index={indice} {...etapa} disabled />)}</RowList></div>,
};

/** Texto longo: título e apoio cortam em uma linha com reticências. */
export const TextoLongo: Story = {
  render: () => <div style={coluna()}><RowList label="Etapas"><ListRowButton icon="play" dot="var(--v2)" title="Enviar mensagem de boas-vindas com o catálogo completo de produtos" description="Executa a tarefa para toda pessoa que entrou pela campanha de outono e pela indicação" actions={<Acoes rotulo="mensagem" />} /></RowList></div>,
};

/** Muitos itens: linhas densas de 44, separador recuado até o texto. */
export const MuitosItens: Story = {
  render: () => <div style={{ ...coluna(), height: 420, overflow: "auto" }}><RowList label="Blocos da página">{Array.from({ length: 40 }, (_, indice) => <ListRowButton key={indice} index={indice} icon={indice % 2 ? "text" : "image"} title={`Bloco ${indice + 1}`} description={indice % 2 ? "Seção de conteúdo" : "Imagem responsiva"} selected={indice === 3} />)}</RowList></div>,
};

/** Largura estreita: o disco e o ponto ficam; o texto corta. */
export const LarguraEstreita: Story = {
  render: () => <div style={coluna(220)}><RowList label="Etapas">{ETAPAS.map((etapa, indice) => <ListRowButton key={etapa.title} index={indice} {...etapa} />)}</RowList></div>,
};
