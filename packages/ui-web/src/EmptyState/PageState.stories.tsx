import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "../Button/Button.js";
import { Mesa, Prancha, Secao } from "../storybook/Prancha.js";
import { PageState } from "./EmptyState.js";

const esperar = () => new Promise((resolve) => setTimeout(resolve, 1500));

const meta: Meta<typeof PageState> = {
  title: "Retorno/Estado de página",
  component: PageState,
  args: { kind: "error", retrying: false },
  argTypes: { kind: { control: "inline-radio", options: ["not-found", "offline", "forbidden", "error"] } },
};
export default meta;
type Story = StoryObj<typeof PageState>;

export const Interativo: Story = { render: (args) => <Mesa largura={320}><PageState {...args} onRetry={esperar} /></Mesa> };

export const Variantes: Story = { render: () => <Prancha>
  <Secao titulo="Os quatro estados" descricao="Raio 40, disco de 44, título 16. Erro e sem conexão tentam de novo no mesmo lugar; o resto da tela segue.">
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, alignItems: "flex-start" }}>
      <PageState kind="not-found" action={<Button size="sm" variant="secondary">Voltar ao início</Button>} />
      <PageState kind="offline" onRetry={esperar} />
      <PageState kind="forbidden" action={<Button size="sm">Pedir acesso</Button>} />
      <PageState kind="error" onRetry={esperar} />
    </div>
  </Secao>
  <Secao titulo="Tentando de novo">
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, alignItems: "flex-start" }}>
      <PageState kind="error" onRetry={() => undefined} retrying />
      <PageState kind="offline" onRetry={() => undefined} retrying />
    </div>
  </Secao>
</Prancha> };

export const TextoProprio: Story = { args: { kind: "forbidden", title: "Indicadores indisponíveis", description: "Seu grupo de acesso ainda não permite consultar pessoas, negócios ou atividades. Peça acesso a quem administra a organização." } };
export const Estreito: Story = { render: () => <Mesa largura={240}><PageState kind="error" onRetry={esperar} /></Mesa> };
