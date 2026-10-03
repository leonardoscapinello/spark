import type { Meta as StoryMeta, StoryObj } from "@storybook/react-vite";
import { Fileira, Mesa, Prancha, Secao } from "../storybook/Prancha.js";
import { FilePicker } from "./FilePicker.js";

const meta: StoryMeta<typeof FilePicker> = {
  title: "Campos/Envio de arquivos",
  component: FilePicker,
  args: { onFiles: () => undefined, appearance: "dropzone", label: "Solte o CSV aqui ou escolha no computador", hint: "Até 5 MB · até 2.000 pessoas", disabled: false },
  argTypes: { appearance: { control: "inline-radio", options: ["dropzone", "button"] }, size: { control: "inline-radio", options: ["sm", "md", "lg"] } },
};
export default meta;
type Story = StoryObj<typeof FilePicker>;

export const Interativo: Story = { render: (args) => <Mesa largura={420}><FilePicker {...args} /></Mesa> };
export const Variantes: Story = { render: () => <Prancha>
  <Secao titulo="Área de envio" descricao="Cavada, raio 28, tracejado de 1,5; arrastando, a borda vira tinta.">
    <Fileira rotulo="Vazia" topo><Mesa largura={360}><FilePicker onFiles={() => undefined} /></Mesa></Fileira>
    <Fileira rotulo="Escolhido" topo><Mesa largura={360}><FilePicker selectedName="pessoas-setembro.csv" onFiles={() => undefined} /></Mesa></Fileira>
    <Fileira rotulo="Desabilitada" topo><Mesa largura={360}><FilePicker disabled onFiles={() => undefined} /></Mesa></Fileira>
  </Secao>
  <Secao titulo="Botão">
    <Fileira rotulo="Tamanhos"><FilePicker appearance="button" size="sm" label="Enviar" onFiles={() => undefined} /><FilePicker appearance="button" label="Enviar arquivos" onFiles={() => undefined} /><FilePicker appearance="button" size="lg" label="Enviar arquivos" onFiles={() => undefined} /></Fileira>
    <Fileira rotulo="Só ícone e desabilitado"><FilePicker appearance="button" iconOnly label="Enviar arquivos" onFiles={() => undefined} /><FilePicker appearance="button" disabled label="Enviando 2 de 3: proposta.pdf" onFiles={() => undefined} /></Fileira>
  </Secao>
</Prancha> };
export const NomeLongo: Story = { render: () => <Mesa largura={280}><FilePicker selectedName="exportacao-completa-de-pessoas-da-regional-sul-setembro-2026.csv" onFiles={() => undefined} /></Mesa> };
