import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "../Button/Button.js";
import { Icon } from "../Icon/Icon.js";
import { Signal } from "../Signal/Signal.js";
import { Fileira, Prancha, Secao } from "../storybook/Prancha.js";
import { Toolbar, ToolbarSeparator, ToolbarText } from "./Toolbar.js";

const ZOOM = <>
  <Button iconOnly size="sm" variant="ghost" icon={<Icon name="minus" />} aria-label="Reduzir zoom" />
  <Button size="sm" variant="ghost" aria-label="Voltar ao zoom de 100%">100%</Button>
  <Button iconOnly size="sm" variant="ghost" icon={<Icon name="plus" />} aria-label="Ampliar zoom" />
</>;

const meta = {
  title: "Ações/Barra de ferramentas",
  component: Toolbar,
  args: { label: "Zoom do fluxo", children: ZOOM },
  argTypes: { children: { control: false } },
} satisfies Meta<typeof Toolbar>;
export default meta;
type Story = StoryObj<typeof meta>;

/* A mesa onde a barra flutua. */
const mesa = { display: "flex", flexWrap: "wrap" as const, gap: 16, padding: 24, background: "var(--bg)" };

/** Mude o nome do grupo pelos controles; os botões são tinta de 28. */
export const Interativo: Story = {
  render: (args) => <div style={mesa}><Toolbar {...args} /></div>,
};

/** Folha de componentes: só ícones, ícone e rótulo, grupos separados e sinal de estado. */
export const Variantes: Story = {
  render: () => <Prancha>
    <Secao titulo="Composições" descricao="Folha erguida em pílula (--sf3, --e2), padding 4, itens a 2px. Grupos se separam por um fio; texto que não é botão entra por ToolbarText.">
      <Fileira rotulo="Só ícones"><Toolbar label="Zoom do fluxo">{ZOOM}</Toolbar></Fileira>
      <Fileira rotulo="Ícone e rótulo"><Toolbar label="Etapas do fluxo"><Button size="sm" variant="ghost" icon={<Icon name="plus" />}>Adicionar etapa</Button></Toolbar></Fileira>
      <Fileira rotulo="Grupos"><Toolbar label="Edição"><Button iconOnly size="sm" variant="ghost" icon={<Icon name="undo" />} aria-label="Desfazer" /><ToolbarSeparator />{ZOOM}</Toolbar></Fileira>
      <Fileira rotulo="Com sinal">
        <Toolbar label="Etapas do fluxo"><Button size="sm" variant="ghost" icon={<Icon name="plus" />}>Adicionar etapa</Button><ToolbarSeparator /><ToolbarText><Signal tone="warning">2 pendências</Signal></ToolbarText></Toolbar>
        <Toolbar label="Etapas do fluxo"><Button size="sm" variant="ghost" icon={<Icon name="plus" />}>Adicionar etapa</Button><ToolbarSeparator /><ToolbarText><Signal tone="success">Pronto para publicar</Signal></ToolbarText></Toolbar>
      </Fileira>
    </Secao>
  </Prancha>,
};

/** Desabilitado: no limite do zoom, o botão vira tinta 4 e a barra continua. */
export const Desabilitado: Story = {
  render: () => <div style={mesa}><Toolbar label="Zoom do fluxo">
    <Button iconOnly size="sm" variant="ghost" icon={<Icon name="minus" />} aria-label="Reduzir zoom" disabled />
    <Button size="sm" variant="ghost" aria-label="Voltar ao zoom de 100%">50%</Button>
    <Button iconOnly size="sm" variant="ghost" icon={<Icon name="plus" />} aria-label="Ampliar zoom" />
  </Toolbar></div>,
};

/** Texto longo: o rótulo do botão nunca quebra; corta e desliza no hover. */
export const TextoLongo: Story = {
  render: () => <div style={{ ...mesa, width: 360 }}><Toolbar label="Etapas do fluxo"><Button size="sm" variant="ghost" icon={<Icon name="plus" />}>Adicionar etapa de boas-vindas da campanha de outono</Button><ToolbarSeparator /><ToolbarText><Signal tone="warning">Conecte um gatilho a uma ação</Signal></ToolbarText></Toolbar></div>,
};

/** Muitos itens: a barra cresce até a largura da área. */
export const MuitosItens: Story = {
  render: () => <div style={mesa}><Toolbar label="Formatação">
    {(["text", "list", "link", "image", "clip", "hash", "tag", "copy"] as const).map((icone) => <Button key={icone} iconOnly size="sm" variant="ghost" icon={<Icon name={icone} />} aria-label={`Inserir ${icone}`} />)}
    <ToolbarSeparator />
    {ZOOM}
  </Toolbar></div>,
};

/** Largura estreita: em vez de vazar da caixa, a barra rola de lado. */
export const LarguraEstreita: Story = {
  render: () => <div style={{ ...mesa, width: 240 }}><Toolbar label="Etapas do fluxo"><Button size="sm" variant="ghost" icon={<Icon name="plus" />}>Adicionar etapa</Button><ToolbarSeparator />{ZOOM}<ToolbarSeparator /><ToolbarText><Signal tone="success">Pronto</Signal></ToolbarText></Toolbar></div>,
};
