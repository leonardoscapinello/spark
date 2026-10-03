import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Checkbox } from "../Checkbox/Checkbox.js";
import { ErrorText } from "../ErrorText/ErrorText.js";
import { Field } from "../Field/Field.js";
import { FieldDescription } from "../Form/Form.js";
import { Input } from "../Input/Input.js";
import { Label } from "../Label/Label.js";
import { DocumentInput } from "../MaskedInput/MaskedInput.js";
import { PasswordInput } from "../PasswordInput/PasswordInput.js";
import { RadioGroup } from "../RadioGroup/RadioGroup.js";
import { Select } from "../Select/Select.js";
import { Mesa, Prancha, Secao } from "../storybook/Prancha.js";
import { Switch } from "../Switch/Switch.js";
import { Textarea } from "../Textarea/Textarea.js";
import { FormField } from "./FormField.js";

const EQUIPES = [{ value: "vendas", label: "Vendas" }, { value: "suporte", label: "Atendimento" }, { value: "sucesso", label: "Sucesso do cliente" }];

const meta = {
  title: "Campos/Composição de campo",
  component: FormField,
  subcomponents: { Field, Label, FieldDescription, ErrorText },
  args: { label: "Nome", layout: "vertical", description: "", error: "", children: <Input placeholder="Nome do contato" /> },
  argTypes: {
    layout: { control: "inline-radio", options: ["vertical", "horizontal", "hidden-label"] },
    children: { control: false },
  },
  parameters: {
    docs: { description: { component: "Rótulo, controle, ajuda e erro sempre na mesma composição. FormField é o atalho; Field + Label + FieldDescription + ErrorText são as peças. id e aria se conectam sozinhos." } },
  },
} satisfies Meta<typeof FormField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Interativo: Story = {};

export const Disposicoes: Story = {
  name: "Disposições",
  render: () => (
    <Prancha>
      <Secao titulo="Rótulo em cima" descricao="O padrão em formulário de cadastro e modal.">
        <Mesa>
          <FormField label="Nome"><Input placeholder="Nome completo" /></FormField>
          <FormField label="E-mail" description="Usado para avisos de atendimento."><Input type="email" placeholder="nome@empresa.com.br" /></FormField>
          <FormField label="Telefone" error="Informe um telefone com DDD."><Input defaultValue="98765" /></FormField>
        </Mesa>
      </Secao>
      <Secao titulo="Rótulo ao lado" descricao="Em configurações e fichas: rótulo à esquerda, controle à direita, o rótulo alinhado ao centro do controle.">
        <Mesa largura={560}>
          <FormField layout="horizontal" label="Nome da organização"><Input defaultValue="Aurora Cosméticos" /></FormField>
          <FormField layout="horizontal" label="Equipe padrão" description="Recebe as conversas sem dono."><Select label="Equipe padrão" options={EQUIPES} defaultValue="suporte" /></FormField>
          <FormField layout="horizontal" label="CNPJ" error="CNPJ inválido."><DocumentInput label="CNPJ" value="11222333000100" onValueChange={() => undefined} /></FormField>
        </Mesa>
      </Secao>
      <Secao titulo="Rótulo escondido" descricao="O rótulo continua lá para o leitor de tela; a tela mostra só o placeholder. Use quando o contexto já diz o que é.">
        <Mesa>
          <FormField layout="hidden-label" label="Buscar"><Input placeholder="Buscar pessoas" /></FormField>
        </Mesa>
      </Secao>
    </Prancha>
  ),
};

function TodosOsControles() {
  const [aceite, setAceite] = useState(false);
  return (
    <Mesa largura={440}>
      <FormField label="Texto"><Input placeholder="Texto livre" /></FormField>
      <FormField label="Senha"><PasswordInput /></FormField>
      <FormField label="CPF ou CNPJ"><DocumentInput label="CPF ou CNPJ" value="" onValueChange={() => undefined} /></FormField>
      <FormField label="Seleção"><Select label="Seleção" options={EQUIPES} /></FormField>
      <FormField label="Texto longo"><Textarea rows={3} /></FormField>
      <RadioGroup label="Visibilidade" defaultValue="equipe" options={[{ value: "eu", label: "Somente eu" }, { value: "equipe", label: "Minha equipe" }, { value: "todos", label: "Toda a organização" }]} />
      <Switch defaultChecked>Notificar por e-mail</Switch>
      <Checkbox checked={aceite} onCheckedChange={setAceite}>Li e aceito os termos</Checkbox>
    </Mesa>
  );
}

export const ComCadaControle: Story = {
  name: "Com cada controle",
  render: () => (
    <Prancha>
      <Secao titulo="Um ritmo só" descricao="Todo controle cabe na mesma composição e na mesma régua vertical: rótulo 12, gap 6, controle de 40, ajuda 11.">
        <TodosOsControles />
      </Secao>
    </Prancha>
  ),
};
