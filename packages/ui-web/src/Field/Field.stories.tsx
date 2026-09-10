import type { Meta, StoryObj } from "@storybook/react-vite";
import { Field } from "./Field.js";
import { Label } from "../Label/Label.js";
import { Input } from "../Input/Input.js";
import { ErrorText } from "../ErrorText/ErrorText.js";

const meta: Meta<typeof Field> = {
  title: "Field",
  component: Field,
};
export default meta;

type Story = StoryObj<typeof Field>;

export const Default: Story = {
  render: () => (
    <Field>
      <Label>Nome</Label>
      <Input placeholder="Seu nome" />
    </Field>
  ),
};

export const ComErro: Story = {
  render: () => (
    <Field invalid>
      <Label>E-mail</Label>
      <Input defaultValue="não-é-email" />
      <ErrorText>E-mail inválido — formato esperado: nome@dominio.com</ErrorText>
    </Field>
  ),
};

export const Desabilitado: Story = {
  render: () => (
    <Field disabled>
      <Label>Plano</Label>
      <Input defaultValue="Pro" />
    </Field>
  ),
};
