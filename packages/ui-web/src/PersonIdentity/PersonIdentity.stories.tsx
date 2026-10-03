import type { Meta, StoryObj } from "@storybook/react-vite";
import { Avatar } from "../Avatar/Avatar.js";
import { Fileira, Mesa, Prancha, Secao } from "../storybook/Prancha.js";
import { PersonIdentity } from "./PersonIdentity.js";

const meta: Meta<typeof PersonIdentity> = { title: "Dados/Identidade de pessoa", component: PersonIdentity, args: { name: "Ana Souza", detail: "ana@aurora.com.br" } };
export default meta;
type Story = StoryObj<typeof PersonIdentity>;

const PESSOAS = ["Ana Souza", "Bruno Lima", "Carla Dias", "Davi Rocha", "Eva Prado", "Fábio Nunes", "Gabriela Reis", "Heitor Campos"];

export const Interativo: Story = {};

export const Variantes: Story = { render: () => <Prancha>
  <Secao titulo="Encaixe" descricao="Avatar de 32 e duas linhas — nome 500 13, detalhe 12 em tinta 2 — que cabem nos 52 da linha da tabela.">
    <Fileira rotulo="Com detalhe"><PersonIdentity name="Ana Souza" detail="ana@aurora.com.br" /></Fileira>
    <Fileira rotulo="Só nome"><PersonIdentity name="Aurora Comércio" /></Fileira>
    <Fileira rotulo="Avatar pronto"><PersonIdentity name="Bruno Lima" detail="Administrador" avatar={<Avatar name="Bruno Lima" />} /></Fileira>
  </Secao>
</Prancha> };

export const NomeLongo: Story = { render: () => <Mesa largura={220}><PersonIdentity name="Ana Beatriz de Souza Albuquerque Figueiredo" detail="ana.beatriz.figueiredo@aurora-comercio-exterior.com.br" /></Mesa> };
export const MuitasPessoas: Story = { render: () => <Mesa largura={280}><div style={{ display: "grid", gap: 12 }}>{PESSOAS.map((name) => <PersonIdentity key={name} name={name} detail={`${name.split(" ")[0]!.toLowerCase()}@aurora.com.br`} />)}</div></Mesa> };
