import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import type { LeadFormField } from "@spark/core";
import { Mesa, Prancha, Secao } from "../storybook/Prancha.js";
import { LeadFormRenderer } from "./LeadForm.js";

const CAMPOS = [
  { id: "nome", type: "text", label: "Nome", required: true, options: [] },
  { id: "email", type: "email", label: "E-mail", required: true, options: [] },
  { id: "telefone", type: "phone", label: "Telefone", required: false, options: [] },
  { id: "interesse", type: "select", label: "Interesse", required: false, options: ["Implantação", "Treinamento", "Suporte"] },
  { id: "mensagem", type: "textarea", label: "Mensagem", required: false, options: [] },
  { id: "aceite", type: "checkbox", label: "Aceito receber contato", required: true, options: [] },
] as unknown as LeadFormField[];

function Formulario({ submitting = false, disabled = false, successMessage = null as string | null }) {
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  return <LeadFormRenderer title="Fale com nossa equipe" description="Responderemos em até um dia útil." fields={CAMPOS} submitLabel="Enviar" values={values} onValueChange={(id, value) => setValues((atual) => ({ ...atual, [id]: value }))} onSubmit={() => undefined} submitting={submitting} disabled={disabled} successMessage={successMessage} />;
}

const meta: Meta<typeof Formulario> = { title: "Padrões/Formulário público", component: Formulario, args: { submitting: false, disabled: false } };
export default meta;
type Story = StoryObj<typeof Formulario>;

export const Interativo: Story = { render: (args) => <Mesa largura={560}><Formulario {...args} /></Mesa> };
export const Variantes: Story = { render: () => <Prancha>
  <Secao titulo="Estados" descricao="Folha erguida de raio 44; enviado mostra o ✓ em disco verde.">
    <Mesa largura={520}><Formulario /></Mesa>
    <Mesa largura={520}><Formulario submitting /></Mesa>
    <Mesa largura={520}><Formulario disabled /></Mesa>
    <Mesa largura={520}><Formulario successMessage="Recebemos seus dados. Em breve alguém da equipe fala com você." /></Mesa>
  </Secao>
</Prancha> };
export const Estreito: Story = { render: () => <Mesa largura={320}><Formulario /></Mesa> };
