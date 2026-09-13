import type { Meta, StoryObj } from "@storybook/react-vite";
import { RecordIdentity } from "./RecordIdentity.js";

const meta: Meta<typeof RecordIdentity> = { title: "Dados/Identidade do registro", component: RecordIdentity, args: { icon: "form", title: "Formulário de contato", subtitle: "Receba pedidos de contato pela página" } };
export default meta;
type Story = StoryObj<typeof RecordIdentity>;
export const ComDescricao: Story = {};
export const SomenteTitulo: Story = { args: { icon: "file", title: "Contrato de prestação de serviços", subtitle: undefined } };
export const Atalho: Story = { args: { icon: "message", title: "Resposta sobre entrega", subtitle: "/prazo", subtitleVariant: "code" } };
