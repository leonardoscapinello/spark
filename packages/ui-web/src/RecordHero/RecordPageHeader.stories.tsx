import type { Meta as StoryMeta, StoryObj } from "@storybook/react-vite";
import { BackLink } from "../BackLink/BackLink.js";
import { Button } from "../Button/Button.js";
import { Fileira, Mesa, Prancha, Secao } from "../storybook/Prancha.js";
import { RecordPageHeader } from "./RecordHero.js";

const meta: StoryMeta<typeof RecordPageHeader> = {
  title: "Estrutura/Cabeçalho de registro",
  component: RecordPageHeader,
  args: {
    back: <BackLink render={<a href="#pessoas" />}>Pessoas</BackLink>,
    icon: "user",
    avatarName: "Maria Oliveira",
    eyebrow: "Pessoa",
    title: "Maria Oliveira",
    description: "maria@empresa.com · (11) 99999-9999",
    actions: <Button variant="secondary">Nova conversa</Button>,
    metrics: [{ label: "Pontuação", value: 87, icon: "star", numeric: true }, { label: "Etapa", value: "Qualificado", icon: "check" }, { label: "Empresa", value: "Acme Brasil", icon: "building" }],
  },
};
export default meta;
type Story = StoryObj<typeof RecordPageHeader>;

export const Interativo: Story = {};
export const Variantes: Story = {
  render: () => <Prancha><Secao titulo="Com e sem voltar">
    <Fileira rotulo="Página" topo><Mesa largura={900}><RecordPageHeader back={<BackLink render={<a href="#empresas" />}>Empresas</BackLink>} icon="building" avatarName="Acme Brasil" eyebrow="Empresa" title="Acme Brasil" description="Acme Serviços Ltda." metrics={[{ label: "Pessoas", value: 12, numeric: true }]} /></Mesa></Fileira>
    <Fileira rotulo="Dentro do painel" topo><Mesa largura={420}><RecordPageHeader back={null} icon="user" avatarName="Carla Prado" eyebrow="Pessoa" title="Carla Prado" description="carla@acme.com" /></Mesa></Fileira>
  </Secao></Prancha>,
};
