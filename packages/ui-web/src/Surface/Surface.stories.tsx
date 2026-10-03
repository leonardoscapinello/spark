import type { Meta, StoryObj } from "@storybook/react-vite";
import { Matriz, Prancha, Secao } from "../storybook/Prancha.js";
import s from "../storybook/Identidade.module.css";
import { Surface, type SurfaceElevation, type SurfaceRadius } from "./Surface.js";

const ALTURAS: readonly SurfaceElevation[] = ["pousada", "erguida", "segurada", "cavada"];
const RAIOS: readonly SurfaceRadius[] = ["sm", "item", "rico", "lista", "md", "bloco", "lg", "kpi", "xl", "2xl"];

function Conteudo({ titulo, texto }: { titulo: string; texto: string }) {
  return <div className={s.vidroConteudo}><strong>{titulo}</strong><small>{texto}</small></div>;
}

const meta = {
  title: "Superfícies/Folha",
  component: Surface,
  args: { elevation: "pousada", radius: "xl", interactive: false, children: <Conteudo titulo="Folha" texto="Papel com granulação, borda de fio e sombra da altura escolhida." /> },
  argTypes: { elevation: { control: "inline-radio", options: ALTURAS }, radius: { control: "select", options: RAIOS }, children: { control: false } },
  parameters: {
    docs: { description: { component: "A única forma de desenhar uma superfície. A tela escolhe a altura e o raio; papel, borda, granulação e sombra vêm daqui. pousada: cartão, tabela; erguida: barra lateral, hover; segurada: modal; cavada: trilho, coluna do quadro." } },
  },
} satisfies Meta<typeof Surface>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Interativo: Story = {};

export const Alturas: Story = {
  render: () => (
    <Prancha>
      <Secao titulo="Alturas × uso">
        <Matriz
          colunas={["Estática", "Clicável"]}
          linhas={ALTURAS.map(altura => ({
            rotulo: altura,
            celulas: [
              <Surface elevation={altura} radius="lista"><Conteudo titulo={altura} texto="Estática" /></Surface>,
              <Surface elevation={altura} radius="lista" interactive tabIndex={0}><Conteudo titulo={altura} texto="Passe o cursor" /></Surface>,
            ],
          }))}
        />
      </Secao>
    </Prancha>
  ),
};

export const Raios: Story = {
  render: () => (
    <Prancha>
      <Secao titulo="Escala de raios em squircle" descricao="sm 18 · item 20 · rico 22 · lista 24 · md 28 · bloco 32 · lg 36 · kpi 40 · xl 44 · 2xl 56.">
        <div className={s.grade}>
          {RAIOS.map(raio => <Surface key={raio} radius={raio}><Conteudo titulo={raio} texto={`radius="${raio}"`} /></Surface>)}
        </div>
      </Secao>
    </Prancha>
  ),
};
