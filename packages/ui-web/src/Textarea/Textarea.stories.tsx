import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { ErrorText } from "../ErrorText/ErrorText.js";
import { Field } from "../Field/Field.js";
import { FieldDescription } from "../Form/Form.js";
import { Label } from "../Label/Label.js";
import { Matriz, Mesa, Prancha, Secao } from "../storybook/Prancha.js";
import { Textarea } from "./Textarea.js";

const meta = {
  title: "Campos/Área de texto",
  component: Textarea,
  args: { placeholder: "Escreva os detalhes", "aria-label": "Observações", rows: 4, disabled: false },
  parameters: {
    docs: { description: { component: "Texto longo. A mesma cavidade do campo, com raio de lista (24) porque cresce em altura. Respira ao digitar, como o campo de texto." } },
  },
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Interativo: Story = {};

export const Estados: Story = {
  render: () => (
    <Prancha>
      <Secao titulo="Estados">
        <Matriz
          colunas={["Vazio", "Preenchido", "Desabilitado", "Somente leitura", "Inválido"]}
          linhas={[{
            rotulo: "rows 3",
            celulas: [
              <Textarea rows={3} aria-label="Vazio" placeholder="Observações" />,
              <Textarea rows={3} aria-label="Preenchido" defaultValue="Cliente pediu proposta com pagamento em três vezes." />,
              <Textarea rows={3} aria-label="Desabilitado" defaultValue="Bloqueado pela automação." disabled />,
              <Textarea rows={3} aria-label="Somente leitura" defaultValue="Registrado pelo sistema." readOnly />,
              <Field invalid><Textarea rows={3} aria-label="Inválido" defaultValue="" /></Field>,
            ],
          }]}
        />
      </Secao>
    </Prancha>
  ),
};

function ComContador() {
  const [texto, setTexto] = useState("");
  return (
    <Field invalid={texto.length > 280}>
      <Label>Mensagem de boas-vindas</Label>
      <Textarea value={texto} onChange={evento => setTexto(evento.target.value)} placeholder="Olá! Como podemos ajudar?" />
      <FieldDescription>{texto.length}/280 caracteres</FieldDescription>
      {texto.length > 280 && <ErrorText>Use no máximo 280 caracteres.</ErrorText>}
    </Field>
  );
}

export const ComContadorEErro: Story = {
  name: "Com contador e erro",
  render: () => (
    <Prancha>
      <Secao titulo="Limite de caracteres" descricao="O contador é ajuda; passou do limite, vira erro que abre espaço.">
        <Mesa largura={480}><ComContador /></Mesa>
      </Secao>
    </Prancha>
  ),
};

export const Alturas: Story = {
  render: () => (
    <Prancha>
      <Secao titulo="Linhas iniciais" descricao="rows define a altura de partida; o usuário pode aumentar.">
        <Mesa largura={480}>
          {[2, 4, 8].map(linhas => <Field key={linhas}><Label>{linhas} linhas</Label><Textarea rows={linhas} /></Field>)}
        </Mesa>
      </Secao>
    </Prancha>
  ),
};
