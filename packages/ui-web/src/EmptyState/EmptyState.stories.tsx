import type { Meta as StoryMeta, StoryObj } from "@storybook/react-vite";
import { Button } from "../Button/Button.js";
import { EmptyState } from "./EmptyState.js";

const meta: StoryMeta<typeof EmptyState> = {
  title: "Fundamentos/Estado vazio",
  component: EmptyState,
  args: { icon: "mail", title: "Comece com uma campanha", description: "Crie um público e prepare sua primeira mensagem para os contatos.", action: <Button>Criar público</Button> },
};
export default meta;
type Story = StoryObj<typeof EmptyState>;
export const ComAcao: Story = {};
export const SemAcao: Story = { args: { icon: "file", title: "Nenhum arquivo", description: "Os arquivos enviados aparecerão aqui.", action: undefined } };
export const PrimeiroUso: Story = { args: { variant: "onboarding", icon: "user", title: "Comece com seus contatos", description: "Cadastre uma pessoa ou importe sua base para reunir o histórico de relacionamento em um só lugar.", action: <Button>Novo contato</Button>, secondaryAction: <Button variant="secondary">Importar CSV</Button> } };
export const PrimeiroUsoEmDestaque: Story = { args: { variant: "featured", icon: "user", title: "Comece com seus contatos", description: "Cadastre uma pessoa ou importe sua base para reunir o histórico de relacionamento em um só lugar.", action: <Button>Novo contato</Button>, secondaryAction: <Button variant="secondary">Importar CSV</Button> } };
export const Relatorios: Story = { args: { variant: "featured", icon: "chart", title: "Os relatórios começam com seus registros", description: "Acompanhe os resultados da equipe no mesmo lugar." } };
export const Automacoes: Story = { args: { variant: "featured", icon: "bolt", title: "Crie sua primeira automação", description: "Escolha um gatilho e defina a próxima ação." } };
export const Agenda: Story = { args: { variant: "featured", icon: "calendar", title: "Planeje a primeira atividade", description: "Agende tarefas e reuniões com sua equipe." } };
export const Comunicacao: Story = { args: { variant: "featured", icon: "mail", title: "Prepare sua primeira campanha", description: "Escolha um público e escreva sua mensagem." } };
