import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Fileira, Mesa, Prancha, Secao } from "../storybook/Prancha.js";
import { InlineEdit, type InlineEditProps } from "./InlineEdit.js";

const meta: Meta<typeof InlineEdit> = { title: "Campos/Edição na linha", component: InlineEdit, args: { label: "Nome", value: "Maria Oliveira", onSave: () => undefined, appearance: "default", disabled: false, saveOnBlur: false } };
export default meta;
type Story = StoryObj<typeof InlineEdit>;

function Example(props: Omit<InlineEditProps, "onSave" | "value"> & { initial: string; fail?: boolean }) {
  const [value, setValue] = useState(props.initial);
  return <InlineEdit {...props} value={value} onSave={async (next) => { if (props.fail) throw new Error("offline"); setValue(next); }} />;
}

export const Interativo: Story = { render: (args) => <Mesa largura={420}><Example {...args} initial={args.value} /></Mesa> };

export const Variantes: Story = {
  render: () => <Prancha>
    <Secao titulo="Aparências" descricao="A mesma caixa da linha de campo: tinta parada, cavada editando.">
      <Fileira rotulo="Padrão (36)"><Mesa largura={360}><Example label="Nome" initial="Maria Oliveira" /></Mesa></Fileira>
      <Fileira rotulo="Título (44)"><div style={{ fontSize: "var(--fs-h1)", fontWeight: 500 }}><Example label="Título do negócio" initial="Expansão da conta Acme" appearance="title" saveOnBlur /></div></Fileira>
      <Fileira rotulo="Compacto (28)"><div style={{ fontSize: "var(--fs-corpo)", fontWeight: 500, width: 220 }}><Example label="Nome da etapa" initial="Proposta enviada" appearance="compact" saveOnBlur /></div></Fileira>
    </Secao>
    <Secao titulo="Estados">
      <Fileira rotulo="Desabilitado"><Example label="Nome" initial="Maria Oliveira" disabled /></Fileira>
      <Fileira rotulo="Vazio"><Example label="Apelido" initial="" placeholder="Sem apelido" /></Fileira>
      <Fileira rotulo="Erro ao salvar"><Mesa largura={360}><Example label="Nome" initial="Maria Oliveira" fail errorText="Não foi possível salvar. Tente de novo." /></Mesa></Fileira>
      <Fileira rotulo="Texto longo"><Mesa largura={260}><Example label="Nome" initial="Ana Beatriz de Oliveira Santos Pereira" /></Mesa></Fileira>
    </Secao>
  </Prancha>,
};
