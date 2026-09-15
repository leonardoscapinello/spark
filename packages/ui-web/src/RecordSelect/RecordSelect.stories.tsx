import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { InlineField } from "../InlineField/InlineField.js";
import type { SelectOption } from "../Select/Select.js";
import { RecordSelect } from "./RecordSelect.js";

const people: SelectOption[] = [
  { value: "ana", label: "Ana Carolina Oliveira dos Santos", description: "ana.carolina@example.com · (11) 99876-5432", avatar: null },
  { value: "jose", label: "José Silva", description: "jose@example.com", avatar: null },
  ...Array.from({ length: 30 }, (_, index) => ({ value: String(index), label: `Pessoa de exemplo ${index + 1}`, description: `pessoa${index + 1}@example.com`, avatar: null })),
];
const meta: Meta<typeof RecordSelect> = { title: "Componentes/RecordSelect", component: RecordSelect, args: { label: "Pessoa do negócio", options: people, value: null, onValueChange: () => undefined } };
export default meta;
type Story = StoryObj<typeof RecordSelect>;

export const BuscaDireta: Story = { render: (args) => { const [value, setValue] = useState<SelectOption | null>(null); return <RecordSelect {...args} value={value} onValueChange={setValue} />; } };
export const NoNegocio: Story = { render: () => { const [value, setValue] = useState<SelectOption | null>(people[0]!); return <InlineField label="Pessoa" value={value?.label ?? "Sem pessoa"}>{(close) => <RecordSelect label="Pessoa do negócio" options={people} value={value} onCancel={close} emptyOptionLabel="Sem pessoa vinculada" onValueChange={(next) => { setValue(next); close(); }} />}</InlineField>; } };
export const EmpresaComNomeLongo: Story = { args: { label: "Empresa do negócio", kind: "company", options: [{ value: "company", label: "Companhia Brasileira de Tecnologia e Soluções Empresariais", description: "12.345.678/0001-90 · empresa.example.com", avatar: null }] } };
export const ComImagem: Story = { args: { options: [{ value: "ana", label: "Ana Oliveira", description: "ana@example.com", avatar: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 80'%3E%3Crect width='80' height='80' fill='%23eee'/%3E%3Ctext x='40' y='48' text-anchor='middle' font-size='26'%3EAO%3C/text%3E%3C/svg%3E" }] } };
export const Vazio: Story = { args: { options: [] } };
export const Carregando: Story = { args: { options: [], loading: true } };
export const Desabilitado: Story = { args: { value: people[0]!, disabled: true } };
