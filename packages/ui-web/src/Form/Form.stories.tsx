import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState, type FormEvent } from "react";
import { FeedbackButton, type FeedbackState } from "../Button/FeedbackButton.js";
import { PhoneInput, type PhoneDraft } from "../MaskedInput/MaskedInput.js";
import { Select } from "../Select/Select.js";
import { Textarea } from "../Textarea/Textarea.js";
import { Button } from "../Button/Button.js";
import { ErrorText } from "../ErrorText/ErrorText.js";
import { Field } from "../Field/Field.js";
import { Input } from "../Input/Input.js";
import { Label } from "../Label/Label.js";
import { Mesa, Prancha, Secao } from "../storybook/Prancha.js";
import { FieldDescription, Form, FormActions } from "./Form.js";

const meta: Meta<typeof Form> = { title: "Campos/Formulário", component: Form };
export default meta;
type Story = StoryObj<typeof Form>;

export const Interativo: Story = { render: () => <Mesa largura={400}><Form onSubmit={(event) => event.preventDefault()}><Field><Label>Nome</Label><Input required /><FieldDescription>Como aparece para a equipe.</FieldDescription><ErrorText match="valueMissing">Informe um nome.</ErrorText></Field><FormActions><Button type="submit">Salvar</Button></FormActions></Form></Mesa> };
export const Variantes: Story = { render: () => <Prancha><Secao titulo="Campo com ajuda e erro" descricao="Rótulo 12/500 a 6px; ajuda 11 em tinta 3; erro abre espaço ao montar.">
  <Mesa largura={400}><Form onSubmit={(event) => event.preventDefault()}>
    <Field><Label>Nome da conexão</Label><Input defaultValue="WhatsApp — Vendas" /><FieldDescription>Aparece na caixa de entrada.</FieldDescription></Field>
    <Field invalid><Label>E-mail</Label><Input defaultValue="ana@" /><ErrorText>Informe um e-mail válido.</ErrorText></Field>
    <Field disabled><Label>Token da API</Label><Input defaultValue="sk_live_••••" disabled /><FieldDescription>Gerado pelo provedor.</FieldDescription></Field>
    <FormActions><Button variant="secondary">Cancelar</Button><Button type="submit">Salvar</Button></FormActions>
  </Form></Mesa>
</Secao></Prancha> };

function NovaPessoa() {
  const [estado, setEstado] = useState<FeedbackState>("idle");
  const [telefone, setTelefone] = useState<PhoneDraft>({ country: "BR", nationalNumber: "" });
  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEstado("pending");
    window.setTimeout(() => setEstado("success"), 1200);
  }
  return (
    <Form onSubmit={enviar}>
      <Field name="nome"><Label>Nome</Label><Input required placeholder="Nome completo" /><ErrorText match="valueMissing">Informe o nome.</ErrorText></Field>
      <Field name="email"><Label>E-mail</Label><Input type="email" required placeholder="nome@empresa.com.br" /><ErrorText match="typeMismatch">Informe um e-mail válido.</ErrorText><ErrorText match="valueMissing">Informe o e-mail.</ErrorText></Field>
      <PhoneInput label="Telefone" value={telefone} onValueChange={setTelefone} countries={[{ id: "BR", label: "Brasil", dialCode: "+55", format: "(##) #####-####" }]} />
      <Field name="origem"><Label>Origem</Label><Select label="Origem" options={[{ value: "site", label: "Site" }, { value: "indicacao", label: "Indicação" }, { value: "evento", label: "Evento" }]} /></Field>
      <Field name="notas"><Label>Notas</Label><Textarea rows={3} /><FieldDescription>Visível só para a equipe.</FieldDescription></Field>
      <FormActions>
        <Button variant="secondary" type="reset" onClick={() => setEstado("idle")}>Cancelar</Button>
        <FeedbackButton type="submit" state={estado} labels={{ idle: "Criar pessoa", pending: "Criando…", success: "Criada" }} />
      </FormActions>
    </Form>
  );
}

export const Cadastro: Story = {
  name: "Cadastro com validação",
  render: () => (
    <Prancha>
      <Secao titulo="Nova pessoa" descricao="Envie vazio para ver os erros; preencha para ver o retorno no próprio botão.">
        <Mesa largura={440}><NovaPessoa /></Mesa>
      </Secao>
    </Prancha>
  ),
};
