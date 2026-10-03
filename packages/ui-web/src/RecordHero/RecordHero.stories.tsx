import type { Meta as StoryMeta, StoryObj } from "@storybook/react-vite";
import { Button } from "../Button/Button.js";
import { Fileira, Mesa, Prancha, Secao } from "../storybook/Prancha.js";
import { RecordHero } from "./RecordHero.js";

const meta: StoryMeta<typeof RecordHero> = {
  title: "Estrutura/Perfil de registro",
  component: RecordHero,
  args: {
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
type Story = StoryObj<typeof RecordHero>;

export const Interativo: Story = {};

export const Variantes: Story = {
  render: () => <Prancha><Secao titulo="Fichas" descricao="Avatar de 56 em pigmento; nome 22/500; tipo num chip neutro; métricas com número em mono.">
    <Fileira rotulo="Pessoa" topo><Mesa largura={900}><RecordHero icon="user" avatarName="Maria Oliveira" eyebrow="Pessoa" title="Maria Oliveira" description="maria@empresa.com · (11) 99999-9999" actions={<Button variant="secondary">Nova conversa</Button>} metrics={[{ label: "Pontuação", value: 87, icon: "star", numeric: true }, { label: "Etapa", value: "Qualificado", icon: "check" }]} /></Mesa></Fileira>
    <Fileira rotulo="Empresa" topo><Mesa largura={900}><RecordHero icon="building" avatarName="Acme Brasil" eyebrow="Tecnologia" title="Acme Brasil" description="Acme Serviços Ltda." metrics={[{ label: "Pessoas", value: 12, icon: "user", numeric: true }, { label: "Negócios", value: 4, icon: "briefcase", numeric: true }, { label: "Valor em aberto", value: "R$ 85.000,00", icon: "chart", numeric: true }]} /></Mesa></Fileira>
    <Fileira rotulo="Sem avatar (ícone)" topo><Mesa largura={900}><RecordHero icon="briefcase" eyebrow="Funil comercial" title="Expansão da conta" description="Atualizado hoje" metrics={[{ label: "Valor", value: "R$ 35.000,00", numeric: true }, { label: "Situação", value: "Ganho", tone: "success" }]} /></Mesa></Fileira>
    <Fileira rotulo="Nome longo, estreito" topo><Mesa largura={360}><RecordHero icon="building" avatarName="Companhia Brasileira" eyebrow="Varejo" title="Companhia Brasileira de Distribuição e Logística Integrada" actions={<Button variant="secondary">Editar</Button>} /></Mesa></Fileira>
  </Secao></Prancha>,
};
