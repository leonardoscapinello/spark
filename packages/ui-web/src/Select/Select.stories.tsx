import type { Meta, StoryObj } from "@storybook/react-vite";
import { Field } from "../Field/Field.js";
import { Label } from "../Label/Label.js";
import { Matriz, Mesa, Palco, Prancha, Secao } from "../storybook/Prancha.js";
import { Select, type SelectOption } from "./Select.js";

const EQUIPES: readonly SelectOption[] = [
  { value: "vendas", label: "Vendas" },
  { value: "suporte", label: "Atendimento" },
  { value: "sucesso", label: "Sucesso do cliente" },
  { value: "arquivada", label: "Equipe arquivada", disabled: true },
];
const PESSOAS: readonly SelectOption[] = [
  { value: "ana", label: "Ana Souza", description: "Atendimento · disponível", avatar: null },
  { value: "rafael", label: "Rafael Lima", description: "Vendas · em reunião", avatar: null },
  { value: "beatriz", label: "Beatriz Nogueira", description: "Sucesso do cliente", avatar: null },
];
const CANAIS: readonly SelectOption[] = [{ value: "email", label: "E-mail" }, { value: "whatsapp", label: "WhatsApp" }, { value: "instagram", label: "Instagram" }];
const ETAPAS: readonly SelectOption[] = [{ value: "todas", label: "Todas as etapas" }, { value: "novos", label: "Novos leads" }, { value: "qualificados", label: "Qualificados" }];

const meta = {
  title: "Campos/Seletor",
  component: Select,
  args: { label: "Equipe", options: EQUIPES, placeholder: "Selecionar", appearance: "field", disabled: false },
  argTypes: { appearance: { control: "inline-radio", options: ["field", "filter"] }, options: { control: false } },
  parameters: {
    docs: { description: { component: "Escolha de uma lista. Aparência de campo (pílula cavada com fio) ou de filtro (folha pousada). O menu é o mesmo vidro de lista de todo dropdown, com o ✓ à direita do item escolhido." } },
  },
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Interativo: Story = { decorators: [Story => <Palco altura={300}><Mesa largura={320}><Story /></Mesa></Palco>] };

export const Variantes: Story = {
  render: () => (
    <Prancha>
      <Secao titulo="Aparências × estados" descricao="Campo é para formulário; filtro é para barra de coleção e cabeçalho de lista.">
        <Matriz
          colunas={["Vazio", "Escolhido", "Com pessoa", "Várias", "Desabilitado"]}
          linhas={(["field", "filter"] as const).map(aparencia => ({
            rotulo: aparencia === "field" ? "Campo · field" : "Filtro · filter",
            celulas: [
              <Select appearance={aparencia} label={`Equipe ${aparencia}`} options={EQUIPES} />,
              <Select appearance={aparencia} label={`Etapa ${aparencia}`} options={ETAPAS} defaultValue="novos" />,
              <Select appearance={aparencia} label={`Responsável ${aparencia}`} options={PESSOAS} defaultValue="ana" />,
              <Select appearance={aparencia} multiple label={`Canais ${aparencia}`} options={CANAIS} defaultValue={["email", "whatsapp"]} />,
              <Select appearance={aparencia} disabled label={`Bloqueado ${aparencia}`} options={EQUIPES} defaultValue="vendas" />,
            ],
          }))}
        />
      </Secao>
    </Prancha>
  ),
};

export const Aberto: Story = {
  name: "Lista aberta",
  tags: ["!autodocs"],
  render: () => (
    <Palco altura={340}>
      <Mesa largura={320}>
        <Field><Label>Responsável</Label><Select label="Responsável" options={PESSOAS} defaultValue="rafael" defaultOpen /></Field>
      </Mesa>
    </Palco>
  ),
};

export const NoFormulario: Story = {
  name: "No formulário",
  render: () => (
    <Mesa>
      <Field><Label>Equipe</Label><Select label="Equipe" options={EQUIPES} /></Field>
      <Field><Label>Canais</Label><Select multiple label="Canais" options={CANAIS} defaultValue={["email"]} /></Field>
    </Mesa>
  ),
};

export const Classificacao: Story = { args: { label: "Prioridade", defaultValue: "medium", options: [{value:"high",label:"Alto",color:"red"},{value:"medium",label:"Médio",color:"amber"},{value:"low",label:"Baixo",color:"green"}] } };

export const NomeCompleto: Story = { render: () => <Mesa largura={240}><Field><Label>Categoria N3</Label><Select wrapValue label="Categoria N3" defaultValue="diagnostico" options={[{ value: "diagnostico", label: "Diagnóstico de processos e oportunidades de inteligência artificial" }]} /></Field></Mesa> };
