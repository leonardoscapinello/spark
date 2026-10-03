import type { Meta, StoryObj } from "@storybook/react-vite";
import { ErrorText } from "../ErrorText/ErrorText.js";
import { Field } from "../Field/Field.js";
import { FieldDescription } from "../Form/Form.js";
import { Label } from "../Label/Label.js";
import { Matriz, Mesa, Prancha, Secao } from "../storybook/Prancha.js";
import { PasswordInput } from "./PasswordInput.js";

const meta = {
  title: "Campos/Senha",
  component: PasswordInput,
  args: { placeholder: "Digite sua senha", "aria-label": "Senha", size: "md", disabled: false },
  argTypes: { size: { control: "inline-radio", options: ["sm", "md", "lg"] } },
  parameters: {
    docs: {
      description: {
        component: "O campo de texto da identidade com o olho para revelar. Cada caractere escondido vira um traço a carvão, e o valor nunca se perde ao alternar.",
      },
    },
  },
} satisfies Meta<typeof PasswordInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Interativo: Story = {};

export const Estados: Story = {
  render: () => (
    <Prancha>
      <Secao titulo="Tamanhos × estados" descricao="O botão de revelar é um botão tinta pequeno dentro da pílula, alcançável pelo teclado.">
        <Matriz
          colunas={["Vazio", "Preenchido", "Desabilitado", "Inválido"]}
          linhas={(["sm", "md", "lg"] as const).map(tamanho => ({
            rotulo: tamanho,
            celulas: [
              <PasswordInput size={tamanho} aria-label={`Senha vazia ${tamanho}`} placeholder="Senha" />,
              <PasswordInput size={tamanho} aria-label={`Senha preenchida ${tamanho}`} defaultValue="segredo-forte" />,
              <PasswordInput size={tamanho} aria-label={`Senha desabilitada ${tamanho}`} defaultValue="segredo-forte" disabled />,
              <Field invalid><PasswordInput size={tamanho} aria-label={`Senha inválida ${tamanho}`} defaultValue="123" /></Field>,
            ],
          }))}
        />
      </Secao>
    </Prancha>
  ),
};

export const NoFormulario: Story = {
  name: "No formulário",
  render: () => (
    <Prancha>
      <Secao titulo="Criar senha e confirmar">
        <Mesa>
          <Field><Label>Senha atual</Label><PasswordInput autoComplete="current-password" /></Field>
          <Field><Label>Nova senha</Label><PasswordInput autoComplete="new-password" /><FieldDescription>Mínimo de 12 caracteres.</FieldDescription></Field>
          <Field invalid><Label>Confirmar nova senha</Label><PasswordInput autoComplete="new-password" defaultValue="diferente" /><ErrorText>As senhas não conferem.</ErrorText></Field>
        </Mesa>
      </Secao>
    </Prancha>
  ),
};
