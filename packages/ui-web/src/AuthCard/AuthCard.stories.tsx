import type { Meta, StoryObj } from "@storybook/react-vite";
import { BackLink } from "../BackLink/BackLink.js";
import { Button } from "../Button/Button.js";
import { FormMessage } from "../Feedback/Feedback.js";
import { Field } from "../Field/Field.js";
import { IconTile } from "../IconTile/IconTile.js";
import { Input } from "../Input/Input.js";
import { Label } from "../Label/Label.js";
import { Mesa, Prancha, Secao } from "../storybook/Prancha.js";
import { AuthCard, AuthShell } from "./AuthCard.js";

const meta: Meta<typeof AuthCard> = { title: "Padrões/Acesso", component: AuthCard, args: { title: "Entre na sua conta", description: "Informe seu e-mail e sua senha para continuar.", pending: "" } };
export default meta;
type Story = StoryObj<typeof AuthCard>;
const formulario = { display: "flex", flexDirection: "column", gap: 18 } as const;

function Login({ erro, sucesso }: { erro?: string; sucesso?: string }) {
  return <div style={formulario}>
    {sucesso && <FormMessage tone="success">{sucesso}</FormMessage>}
    <Field invalid={Boolean(erro)}><Label>E-mail</Label><Input type="email" placeholder="voce@empresa.com" defaultValue={erro ? "ana@" : undefined} /></Field>
    <Field invalid={Boolean(erro)}><Label>Senha</Label><Input type="password" placeholder="Digite sua senha" /></Field>
    {erro && <FormMessage>{erro}</FormMessage>}
    <Button size="lg">Entrar</Button>
  </div>;
}

export const Interativo: Story = { render: (args) => <AuthCard {...args}><Login /></AuthCard> };
export const Variantes: Story = { render: () => <Prancha><Secao titulo="Estados" descricao="Folha erguida de raio 44; enquanto entra, o conteúdo dá lugar ao ensō.">
  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 20, alignItems: "start" }}>
    <AuthCard title="Entre na sua conta" description="Informe seu e-mail e sua senha para continuar."><Login /></AuthCard>
    <AuthCard title="Entre na sua conta" description="Informe seu e-mail e sua senha para continuar."><Login erro="Não foi possível entrar com esse e-mail e senha." /></AuthCard>
    <AuthCard title="Entre na sua conta" description="Informe seu e-mail e sua senha para continuar."><Login sucesso="Senha atualizada. Você já pode entrar." /></AuthCard>
    <AuthCard title="Entre na sua conta" pending="Entrando…" />
    <AuthCard mark={<IconTile icon="mail" size="xl" tone="success" />} title="Confira seu e-mail" description="Se houver uma conta com esse endereço, enviaremos as instruções."><BackLink href="#login">Voltar para o login</BackLink></AuthCard>
  </div>
</Secao></Prancha> };
export const Casca: Story = { render: () => <AuthShell brand={<strong>Spark</strong>} headline="Cada pessoa. Todo o contexto." lead="Atendimento, negócios e automações conectados para a sua equipe." footer="© Spark"><AuthCard title="Entre na sua conta" description="Informe seu e-mail e sua senha para continuar."><Login /></AuthCard></AuthShell> };
export const Estreito: Story = { render: () => <Mesa largura={320}><AuthCard title="Recuperar acesso" description="Informe seu e-mail para receber as instruções de recuperação."><Login /></AuthCard></Mesa> };
