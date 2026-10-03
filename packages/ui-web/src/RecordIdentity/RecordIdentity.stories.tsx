import type { Meta, StoryObj } from "@storybook/react-vite";
import { Fileira, Mesa, Prancha, Secao } from "../storybook/Prancha.js";
import { RecordIdentity } from "./RecordIdentity.js";

const meta: Meta<typeof RecordIdentity> = { title: "Dados/Identidade do registro", component: RecordIdentity, args: { icon: "form", title: "Formulário de contato", subtitle: "Receba pedidos de contato pela página", subtitleVariant: "default" } };
export default meta;
type Story = StoryObj<typeof RecordIdentity>;
export const Interativo: Story = { render: (args) => <Mesa largura={320}><RecordIdentity {...args} /></Mesa> };
export const Variantes: Story = {
  render: () => <Prancha><Secao titulo="Variantes" descricao="Disco de ícone de 28 + nome 13/500 e apoio 12 em tinta 3.">
    <Fileira rotulo="Com descrição"><RecordIdentity icon="form" title="Formulário de contato" subtitle="Receba pedidos de contato pela página" /></Fileira>
    <Fileira rotulo="Só título"><RecordIdentity icon="file" title="Contrato de prestação de serviços" /></Fileira>
    <Fileira rotulo="Atalho (mono)"><RecordIdentity icon="message" title="Resposta sobre entrega" subtitle="/prazo" subtitleVariant="code" /></Fileira>
    <Fileira rotulo="Texto longo"><Mesa largura={200}><RecordIdentity icon="page" title="Página de captação da campanha de fim de ano" subtitle="spark.app/p/campanha-fim-de-ano-2026" /></Mesa></Fileira>
  </Secao></Prancha>,
};
