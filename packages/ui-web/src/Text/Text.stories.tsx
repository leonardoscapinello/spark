import type { Meta, StoryObj } from "@storybook/react-vite";
import { Fileira, Matriz, Mesa, Prancha, Secao } from "../storybook/Prancha.js";
import { Text } from "./Text.js";

const meta: Meta<typeof Text> = {
  title: "Estrutura/Texto",
  component: Text,
  args: { children: "Acompanhe as pessoas e o histórico de relacionamento.", size: "corpo", tone: "default", weight: "regular", mono: false, truncate: false },
  argTypes: { size: { control: "inline-radio", options: ["corpo-l", "corpo", "pequeno", "legenda"] }, tone: { control: "select", options: ["default", "secondary", "muted", "success", "warning", "danger"] }, weight: { control: "inline-radio", options: ["regular", "medium"] }, lines: { control: "inline-radio", options: [undefined, 2, 3] } },
};
export default meta;
type Story = StoryObj<typeof Text>;

const TAMANHOS = [["corpo-l", "Corpo L · 14"], ["corpo", "Corpo · 13"], ["pequeno", "Pequeno · 12"], ["legenda", "Legenda · 11"]] as const;
const TINTAS = [["default", "Tinta"], ["secondary", "Apoio"], ["muted", "Metadado"], ["success", "Sucesso"], ["warning", "Atenção"], ["danger", "Erro"]] as const;

export const Interativo: Story = {};

export const Variantes: Story = { render: () => <Prancha>
  <Secao titulo="Tamanho × tinta" descricao="A tela escolhe o papel do texto; tamanho, peso e cor vêm daqui. Tinta 4 fica de fora: é só para desabilitado.">
    <Matriz colunas={TINTAS.map(([, rotulo]) => rotulo)} linhas={TAMANHOS.map(([size, rotulo]) => ({ rotulo, celulas: TINTAS.map(([tone]) => <Text size={size} tone={tone}>Texto</Text>) }))} />
  </Secao>
  <Secao titulo="Papéis">
    <Fileira rotulo="Nome em 500"><Text weight="medium">Ana Souza</Text></Fileira>
    <Fileira rotulo="Número em mono"><Text mono>R$ 184.320,00</Text><Text mono size="pequeno" tone="secondary">12 de 340</Text></Fileira>
    <Fileira rotulo="Código"><Text as="code" mono size="pequeno">00.000.000/0001-91</Text></Fileira>
  </Secao>
</Prancha> };

export const Corte: Story = { render: () => <Mesa largura={240}><div style={{ display: "grid", gap: 12 }}><Text truncate>Uma linha só, que corta com reticências quando não cabe na coluna.</Text><Text lines={2} size="pequeno" tone="secondary">Até duas linhas: o texto continua na linha seguinte e, se ainda assim não couber, termina com reticências no fim da segunda linha.</Text></div></Mesa> };
export const Estreito: Story = { render: () => <Mesa largura={120}><Text>Palavras-muito-compridas-sem-espaço quebram em vez de vazar da caixa.</Text></Mesa> };
