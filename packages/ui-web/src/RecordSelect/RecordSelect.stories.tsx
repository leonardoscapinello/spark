import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { InlineField } from "../InlineField/InlineField.js";
import type { SelectOption } from "../Select/Select.js";
import { TooltipProvider } from "../Tooltip/Tooltip.js";
import { Fileira, Mesa, Palco, Prancha, Secao } from "../storybook/Prancha.js";
import { RecordSelect } from "./RecordSelect.js";

const people: SelectOption[] = [
  { value: "ana", label: "Ana Carolina Oliveira dos Santos", description: "ana.carolina@example.com · (11) 99876-5432", avatar: null },
  { value: "jose", label: "José Silva", description: "jose@example.com", avatar: null },
  ...Array.from({ length: 30 }, (_, index) => ({ value: String(index), label: `Pessoa de exemplo ${index + 1}`, description: `pessoa${index + 1}@example.com`, avatar: null })),
];
const meta: Meta<typeof RecordSelect> = { title: "Campos/Busca de registro", component: RecordSelect, decorators: [(Story) => <TooltipProvider><Story /></TooltipProvider>], args: { label: "Pessoa do negócio", options: people, value: null, onValueChange: () => undefined, kind: "person", disabled: false, loading: false } };
export default meta;
type Story = StoryObj<typeof RecordSelect>;

function Example(props: Partial<Parameters<typeof RecordSelect>[0]> & { initial?: SelectOption | null }) {
  const [value, setValue] = useState<SelectOption | null>(props.initial ?? null);
  return <RecordSelect label="Pessoa do negócio" options={people} {...props} value={value} onValueChange={setValue} />;
}

export const Interativo: Story = { render: (args) => <Palco altura={380}><Mesa largura={360}><Example {...args} initial={args.value} /></Mesa></Palco> };

export const Variantes: Story = {
  render: () => <Prancha><Secao titulo="Campo" descricao="Pílula cavada do Input; ícone no encaixe de 24, o mesmo do avatar.">
    <Fileira rotulo="Pessoa"><Mesa largura={360}><Example /></Mesa></Fileira>
    <Fileira rotulo="Empresa"><Mesa largura={360}><Example label="Empresa do negócio" kind="company" options={[{ value: "acme", label: "Companhia Brasileira de Tecnologia e Soluções Empresariais", description: "12.345.678/0001-90 · empresa.example.com", avatar: null }]} /></Mesa></Fileira>
    <Fileira rotulo="Preenchida"><Mesa largura={360}><Example initial={people[1]!} /></Mesa></Fileira>
    <Fileira rotulo="Carregando"><Mesa largura={360}><Example options={[]} loading /></Mesa></Fileira>
    <Fileira rotulo="Sem resultados"><Mesa largura={360}><Example options={[]} /></Mesa></Fileira>
    <Fileira rotulo="Desabilitada"><Mesa largura={360}><Example initial={people[0]!} disabled /></Mesa></Fileira>
  </Secao></Prancha>,
};

/** Dentro da linha de campo: a busca vira o miolo da caixa do InlineField. */
export const NaLinhaDoCampo: Story = {
  render: () => {
    function Inline() {
      const [value, setValue] = useState<SelectOption | null>(people[0]!);
      return <Palco altura={380}><Mesa largura={420}><InlineField label="Pessoa" value={value?.label ?? "Sem pessoa"} empty={!value}>{(close) => <RecordSelect label="Pessoa do negócio" options={people} value={value} onCancel={close} emptyOptionLabel="Sem pessoa vinculada" onValueChange={(next) => { setValue(next); close(); }} />}</InlineField></Mesa></Palco>;
    }
    return <Inline />;
  },
};
