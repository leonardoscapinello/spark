import type { Meta as StoryMeta, StoryObj } from "@storybook/react-vite";
import { Button } from "../Button/Button.js";
import { PageHeader } from "./PageHeader.js";

const meta: StoryMeta<typeof PageHeader> = {
  title: "Fundamentos/Cabeçalho de página",
  component: PageHeader,
  args: { title: "Todos os contatos", icon: "user", description: "Acompanhe as pessoas e o histórico de relacionamento.", actions: <Button>Novo contato</Button> },
};
export default meta;
type Story = StoryObj<typeof PageHeader>;
export const ComIcone: Story = {};
export const SemIcone: Story = { render: () => <PageHeader title="Segurança da conta" description="Proteja seu acesso e seus dispositivos." /> };
