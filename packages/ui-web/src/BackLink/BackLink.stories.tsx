import type { Meta as StoryMeta, StoryObj } from "@storybook/react-vite";
import { Fileira, Mesa, Prancha, Secao } from "../storybook/Prancha.js";
import { BackLink } from "./BackLink.js";

const meta: StoryMeta<typeof BackLink> = { title: "Navegação/Voltar", component: BackLink, args: { href: "#negocios", children: "Negócios" } };
export default meta;
type Story = StoryObj<typeof BackLink>;

export const Interativo: Story = {};
export const NaFicha: Story = { args: { iconOnly: true, children: "Voltar aos negócios" } };
export const Variantes: Story = { render: () => <Prancha><Secao titulo="Voltar" descricao="Tinta 2, 500 12, pílula de 30; o hover é o realce de tinta.">
  <Fileira rotulo="Curto"><BackLink href="#pessoas">Pessoas</BackLink></Fileira>
  <Fileira rotulo="Descritivo"><BackLink href="#login">Voltar para o login</BackLink></Fileira>
</Secao></Prancha> };
export const TextoLongo: Story = { render: () => <Mesa largura={200}><BackLink href="#configuracoes">Configurações da organização e das integrações</BackLink></Mesa> };
