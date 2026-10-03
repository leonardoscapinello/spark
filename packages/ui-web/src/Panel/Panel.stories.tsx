import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "../Button/Button.js";
import { Field } from "../Field/Field.js";
import { Input } from "../Input/Input.js";
import { Label } from "../Label/Label.js";
import { Fileira, Prancha, Secao } from "../storybook/Prancha.js";
import { Panel, PanelClose, PanelContent, PanelTrigger, type PanelSide } from "./Panel.js";

const LADOS: readonly [PanelSide, string][] = [["right", "Direita"], ["left", "Esquerda"], ["top", "Topo"], ["bottom", "Base"]];

function Lado({ lado, rotulo, aberto = false }: { lado: PanelSide; rotulo: string; aberto?: boolean }) {
  return (
    <Panel defaultOpen={aberto}>
      <PanelTrigger render={<Button variant="secondary">{rotulo}</Button>} />
      <PanelContent side={lado} title="Filtros da lista" description="Os filtros valem só para você." footer={<><PanelClose render={<Button variant="secondary">Limpar</Button>} /><Button>Aplicar</Button></>}>
        <Field><Label>Nome contém</Label><Input placeholder="Ex.: Aurora" /></Field>
      </PanelContent>
    </Panel>
  );
}

const meta = {
  title: "Camadas/Painel lateral",
  component: PanelContent,
  subcomponents: { Panel, PanelTrigger, PanelClose },
  args: { title: "Filtros da lista", side: "right", children: null },
  argTypes: { side: { control: "inline-radio", options: ["right", "left", "top", "bottom"] }, children: { control: false } },
  parameters: {
    docs: { description: { component: "A modal em gaveta: desliza da borda em 450 ms com mola Respiro e sai em 220 ms. O véu desfoca só do lado do painel." } },
  },
} satisfies Meta<typeof PanelContent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Interativo: Story = {
  render: args => (
    <Panel>
      <PanelTrigger render={<Button variant="secondary">Abrir painel</Button>} />
      <PanelContent {...args}><Field><Label>Nome contém</Label><Input /></Field></PanelContent>
    </Panel>
  ),
};

export const QuatroLados: Story = {
  name: "Quatro lados",
  render: () => (
    <Prancha>
      <Secao titulo="De onde o painel vem">
        <Fileira rotulo="side">{LADOS.map(([lado, rotulo]) => <Lado key={lado} lado={lado} rotulo={rotulo} />)}</Fileira>
      </Secao>
    </Prancha>
  ),
};

export const Aberto: Story = {
  tags: ["!autodocs"],
  render: () => <Lado lado="right" rotulo="Abrir de novo" aberto />,
};
