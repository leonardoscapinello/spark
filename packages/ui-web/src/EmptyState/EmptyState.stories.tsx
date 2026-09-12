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
