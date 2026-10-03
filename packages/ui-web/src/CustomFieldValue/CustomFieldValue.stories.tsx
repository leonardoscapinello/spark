import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { CUSTOM_FIELD_TYPES, type CustomFieldDefinition, type CustomFieldType } from "@spark/core";
import { TooltipProvider } from "../Tooltip/Tooltip.js";
import { Fileira, Mesa, Prancha, Secao } from "../storybook/Prancha.js";
import { CustomFieldValue } from "./CustomFieldValue.js";

const define = (type: CustomFieldType, label: string, options: string[] = []): CustomFieldDefinition =>
  ({ id: `f-${type}`, key: type, label, type, options, required: false, archivedAt: null } as unknown as CustomFieldDefinition);

const LABELS: Record<CustomFieldType, string> = {
  text: "Cargo", paragraph: "Observações", number: "Assentos", currency: "Ticket médio",
  date: "Renovação", datetime: "Próxima reunião", phone: "Telefone comercial",
  email: "E-mail de cobrança", document: "CNPJ", url: "Site",
  boolean: "Contrato assinado", single_select: "Plano", multi_select: "Interesses",
};

const meta: Meta<typeof CustomFieldValue> = {
  title: "Campos/Campo personalizado",
  component: CustomFieldValue,
  decorators: [(Story) => <TooltipProvider><Story /></TooltipProvider>],
  args: { field: define("text", "Cargo"), value: "Diretora", onSave: async () => undefined, disabled: false, layout: "inline" },
};
export default meta;
type Story = StoryObj<typeof CustomFieldValue>;

export const Interativo: Story = { render: (args) => { function Example() { const [value, setValue] = useState<unknown>(args.value); return <Mesa largura={440}><CustomFieldValue {...args} value={value} onSave={async (next) => setValue(next)} /></Mesa>; } return <Example />; } };

/** Todo tipo que a organização pode criar, na mesma linha do InlineField. */
export const Variantes: Story = {
  render: () => {
    function All() {
      const [values, setValues] = useState<Record<string, unknown>>({ currency: 249900, boolean: true, single_select: "Pro", document: "11222333000181", text: "Diretora", date: "2026-11-30" });
      return <Prancha><Secao titulo="Tipos" descricao="Número, data, dinheiro e documento em mono; vazio mostra «Adicionar».">
        <Mesa largura={520}>{CUSTOM_FIELD_TYPES.map((type) => {
          const field = define(type, LABELS[type], type.includes("select") ? ["Básico", "Pro", "Enterprise"] : []);
          return <CustomFieldValue key={type} field={field} value={values[type]} onSave={async (next) => { setValues((current) => ({ ...current, [type]: next })); }} />;
        })}</Mesa>
      </Secao></Prancha>;
    }
    return <All />;
  },
};

export const Estados: Story = {
  render: () => <Prancha><Secao titulo="Estados">
    <Fileira rotulo="Bloqueado"><Mesa largura={440}><CustomFieldValue field={define("currency", "Ticket médio")} value={249900} disabled onSave={async () => {}} /></Mesa></Fileira>
    <Fileira rotulo="Falha ao gravar"><Mesa largura={440}><CustomFieldValue field={define("text", "Cargo")} value="Diretora" onSave={async () => { throw new Error("Sem conexão"); }} /></Mesa></Fileira>
    <Fileira rotulo="Na etapa (empilhado)"><Mesa largura={440}><CustomFieldValue field={define("single_select", "Origem do negócio", ["Indicação", "Site", "Evento"])} layout="stacked" hint="Importante" value={null} onSave={async () => {}} /></Mesa></Fileira>
  </Secao></Prancha>,
};
