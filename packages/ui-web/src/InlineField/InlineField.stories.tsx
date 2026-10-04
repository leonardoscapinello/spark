import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Avatar } from "../Avatar/Avatar.js";
import { DatePicker } from "../DateTimePicker/DateTimePicker.js";
import { Input } from "../Input/Input.js";
import { Select } from "../Select/Select.js";
import { Textarea } from "../Textarea/Textarea.js";
import { TooltipProvider } from "../Tooltip/Tooltip.js";
import { Fileira, Matriz, Mesa, Prancha, Secao } from "../storybook/Prancha.js";
import { InlineField } from "./InlineField.js";

const meta: Meta<typeof InlineField> = {
  title: "Campos/Campo na linha",
  component: InlineField,
  decorators: [(Story) => <TooltipProvider><Story /></TooltipProvider>],
  args: { label: "Título", value: "Contrato anual Acme", empty: false, disabled: false, required: false, numeric: false, block: false },
};
export default meta;
type Story = StoryObj<typeof InlineField>;

/** Linha de texto que grava ao sair do campo. */
function TextRow({ label, initial, editing = false, numeric = false, required = false, disabled = false, fail = false }: { label: string; initial: string; editing?: boolean; numeric?: boolean; required?: boolean; disabled?: boolean; fail?: boolean }) {
  const [value, setValue] = useState(initial);
  return <InlineField label={label} value={value || "Não informado"} empty={!value} numeric={numeric} required={required} disabled={disabled} defaultEditing={editing}>
    {(close) => <Input aria-label={label} defaultValue={value} numeric={numeric} onBlur={(event) => { const next = event.target.value; close(fail ? Promise.reject(new Error("offline")) : new Promise<void>((resolve) => { setTimeout(() => { setValue(next); resolve(); }, 600); })); }} />}
  </InlineField>;
}

export const Interativo: Story = {
  render: (args) => {
    function Example() {
      const [value, setValue] = useState(String(args.value ?? ""));
      return <Mesa largura={440}><InlineField {...args} value={value || "Não informado"} empty={args.empty || !value}>
        {(close) => <Input aria-label={args.label} defaultValue={value} onBlur={(event) => { setValue(event.target.value); close(); }} />}
      </InlineField></Mesa>;
    }
    return <Example />;
  },
};

/** O contrato: a caixa é a mesma nos três estados; só a superfície muda. */
export const Variantes: Story = {
  render: () => <Prancha>
    <Secao titulo="Três estados, uma caixa" descricao="Preenchido (tinta), vazio («Adicionar» em tinta 3) e editando (papel cavado com halo). Altura, raio e recuo não mudam.">
      <Matriz colunas={["Preenchido", "Vazio", "Editando"]} linhas={[
        { rotulo: "Texto", celulas: [<Mesa key="a" largura={300}><TextRow label="Cargo" initial="Diretora" /></Mesa>, <Mesa key="b" largura={300}><TextRow label="Cargo" initial="" /></Mesa>, <Mesa key="c" largura={300}><TextRow label="Cargo" initial="Diretora" editing /></Mesa>] },
        { rotulo: "Número", celulas: [<Mesa key="a" largura={300}><TextRow label="Assentos" initial="48" numeric /></Mesa>, <Mesa key="b" largura={300}><TextRow label="Assentos" initial="" numeric /></Mesa>, <Mesa key="c" largura={300}><TextRow label="Assentos" initial="48" numeric editing /></Mesa>] },
      ]} />
    </Secao>
    <Secao titulo="Estados de apoio">
      <Fileira rotulo="Só leitura"><Mesa largura={360}><TextRow label="Valor" initial="R$ 48.000,00" numeric disabled /></Mesa></Fileira>
      <Fileira rotulo="Obrigatório"><Mesa largura={360}><TextRow label="Origem" initial="" required /></Mesa></Fileira>
      <Fileira rotulo="Erro ao gravar"><Mesa largura={360}><TextRow label="Cargo" initial="Diretora" fail /></Mesa></Fileira>
      <Fileira rotulo="Texto longo"><Mesa largura={360}><TextRow label="Razão social muito comprida da empresa" initial="Companhia Brasileira de Distribuição e Logística Integrada S.A." /></Mesa></Fileira>
    </Secao>
  </Prancha>,
};

/** Um painel de ficha: data, responsável com avatar, registro com ação e texto longo. */
export const Painel: Story = {
  render: () => {
    function Panel() {
      const [date, setDate] = useState("2026-10-15");
      const [owner, setOwner] = useState<string | null>("1");
      const [notes, setNotes] = useState("Cliente pediu revisão do escopo.\nRetorno até sexta.");
      const people = [{ value: "1", label: "Leonardo Scapinello", avatar: null }, { value: "2", label: "Carla Prado", avatar: null }];
      const ownerName = people.find((person) => person.value === owner)?.label;
      return <Mesa largura={440}>
        <TextRow label="Título" initial="Contrato anual Acme" />
        <InlineField label="Produtos" value="5 produtos" action={{ label: "Ver itens e valores", icon: "right", onClick: () => undefined }} />
        <InlineField label="Previsão" numeric value={date ? new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR") : "Sem previsão"} empty={!date}>
          {(close) => <DatePicker label="Previsão" value={date} onValueChange={(next) => { setDate(next); close(); }} />}
        </InlineField>
        <InlineField label="Responsável" value={ownerName ?? "Não atribuído"} empty={!ownerName} {...(ownerName ? { leading: <Avatar name={ownerName} size="small" /> } : {})}>
          {(close) => <Select label="Responsável" value={owner} options={people} onValueChange={(next) => { setOwner(next); close(); }} />}
        </InlineField>
        <InlineField label="Pessoa" value="Carla Prado" leading={<Avatar name="Carla Prado" size="small" />} action={{ label: "Abrir Carla Prado", icon: "eye", onClick: () => undefined }}>
          {(close) => <Input aria-label="Pessoa" defaultValue="Carla Prado" onBlur={() => close()} />}
        </InlineField>
        <InlineField label="Site" value="acme.com.br" href="https://acme.com.br">
          {(close) => <Input aria-label="Site" defaultValue="acme.com.br" onBlur={() => close()} />}
        </InlineField>
        <InlineField label="Observações" block value={notes} empty={!notes}>
          {(close) => <Textarea aria-label="Observações" rows={3} defaultValue={notes} onBlur={(event) => { setNotes(event.target.value); close(); }} />}
        </InlineField>
      </Mesa>;
    }
    return <Panel />;
  },
};

export const ColunaEstreita: Story = {
  render: () => <Mesa largura={220}><TextRow label="Cargo" initial="Diretora de operações" /><TextRow label="Origem" initial="" /></Mesa>,
};
