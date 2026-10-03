import type { Meta, StoryObj } from "@storybook/react-vite";
import { Fileira, Matriz, Prancha, Secao } from "../storybook/Prancha.js";
import { Switch } from "./Switch.js";

const meta = {
  title: "Escolhas/Chave",
  component: Switch,
  args: { children: "Notificar por e-mail", disabled: false, defaultChecked: false },
  parameters: {
    docs: { description: { component: "Chave de 42 × 24: trilho cavado; ligada, o trilho vira carvão e a pastilha corre com mola em 510 ms. Para ligar e desligar na hora, sem botão de salvar." } },
  },
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Interativo: Story = {};

export const Estados: Story = {
  render: () => (
    <Prancha>
      <Secao titulo="Estados">
        <Matriz
          colunas={["Desligada", "Ligada"]}
          linhas={[
            { rotulo: "Habilitada", celulas: [<Switch>Atribuição automática</Switch>, <Switch defaultChecked>Atribuição automática</Switch>] },
            { rotulo: "Desabilitada", celulas: [<Switch disabled>Atribuição automática</Switch>, <Switch disabled defaultChecked>Atribuição automática</Switch>] },
          ]}
        />
      </Secao>
      <Secao titulo="Lista de preferências" descricao="Várias chaves em coluna mantêm o mesmo alinhamento do texto.">
        <Fileira rotulo="Notificações" coluna>
          <Switch defaultChecked>Nova conversa atribuída</Switch>
          <Switch defaultChecked>Menção em nota interna</Switch>
          <Switch>Resumo diário por e-mail</Switch>
        </Fileira>
      </Secao>
    </Prancha>
  ),
};
