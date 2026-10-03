import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Button } from "../Button/Button.js";
import { ErrorText } from "../ErrorText/ErrorText.js";
import { Field } from "../Field/Field.js";
import { FieldDescription } from "../Form/Form.js";
import { Icon } from "../Icon/Icon.js";
import { Label } from "../Label/Label.js";
import { Fileira, Matriz, Mesa, Prancha, Secao } from "../storybook/Prancha.js";
import { Tooltip, TooltipProvider } from "../Tooltip/Tooltip.js";
import { Input, type InputSize } from "./Input.js";

const TAMANHOS: readonly [InputSize, string][] = [["sm", "sm · 36"], ["md", "md · 40"], ["lg", "lg · 44"]];

const meta = {
  title: "Campos/Texto",
  component: Input,
  args: { placeholder: "Nome do contato", size: "md", disabled: false, readOnly: false, numeric: false, "aria-label": "Nome do contato" },
  argTypes: {
    size: { control: "inline-radio", options: ["sm", "md", "lg"] },
    startAdornment: { control: false },
    endAdornment: { control: false },
  },
  parameters: {
    docs: {
      description: {
        component: "Campo de texto da identidade: pílula cavada de 40, foco com traço de tinta e halo, erro com fio vermelho. Dentro de Field, rótulo, ajuda e erro se conectam sozinhos. Ao digitar, a caixa respira e cada letra surge da tinta.",
      },
    },
  },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Interativo: Story = {};

export const Estados: Story = {
  render: () => (
    <Prancha>
      <Secao titulo="Tamanhos × estados" descricao="Vazio mostra o placeholder em --tx4; preenchido usa --tx; desabilitado perde o relevo; somente leitura mantém a leitura sem convidar a editar; inválido ganha o fio de erro.">
        <Matriz
          colunas={["Vazio", "Preenchido", "Desabilitado", "Somente leitura", "Inválido"]}
          linhas={TAMANHOS.map(([tamanho, rotulo]) => ({
            rotulo,
            celulas: [
              <Input size={tamanho} aria-label={`Vazio ${rotulo}`} placeholder="Nome" />,
              <Input size={tamanho} aria-label={`Preenchido ${rotulo}`} defaultValue="Ana Souza" />,
              <Input size={tamanho} aria-label={`Desabilitado ${rotulo}`} defaultValue="Ana Souza" disabled />,
              <Input size={tamanho} aria-label={`Somente leitura ${rotulo}`} defaultValue="Ana Souza" readOnly />,
              <Field invalid><Input size={tamanho} aria-label={`Inválido ${rotulo}`} defaultValue="ana@" /></Field>,
            ],
          }))}
        />
      </Secao>
    </Prancha>
  ),
};

export const ComRotuloAjudaEErro: Story = {
  name: "Com rótulo, ajuda e erro",
  render: () => (
    <Prancha>
      <Secao titulo="Composição de campo" descricao="Rótulo 12/500 em cima, ajuda 11 em --tx3 embaixo, erro em vermelho que abre espaço ao aparecer.">
        <Mesa>
          <Field><Label>Nome</Label><Input placeholder="Nome completo" /></Field>
          <Field><Label>E-mail</Label><Input type="email" placeholder="nome@empresa.com.br" /><FieldDescription>Usado para avisos de atendimento.</FieldDescription></Field>
          <Field invalid><Label>E-mail de cobrança</Label><Input type="email" defaultValue="financeiro@" /><ErrorText>Informe um e-mail válido.</ErrorText></Field>
          <Field disabled><Label>Identificador</Label><Input defaultValue="org_2Y8x91" /><FieldDescription>Gerado pelo sistema.</FieldDescription></Field>
        </Mesa>
      </Secao>
    </Prancha>
  ),
};

function ComLimpar() {
  const [valor, setValor] = useState("Ana");
  return (
    <Input
      aria-label="Buscar pessoa"
      startAdornment={<Icon name="search" />}
      endAdornment={valor ? <Button variant="ghost" size="sm" iconOnly icon={<Icon name="x" />} aria-label="Limpar busca" onClick={() => setValor("")} /> : undefined}
      placeholder="Buscar pessoa"
      value={valor}
      onChange={evento => setValor(evento.target.value)}
    />
  );
}

export const Complementos: Story = {
  render: () => (
    <Prancha>
      <Secao titulo="Ícones, prefixos e sufixos" descricao="O complemento fica dentro da pílula, em --tx3, e não recebe foco. Botões dentro do campo são ghost sm.">
        <Mesa largura={420}>
          <Field><Label>Pesquisar</Label><Input startAdornment={<Icon name="search" />} placeholder="Pesquisar contatos" /></Field>
          <Field><Label>E-mail</Label><Input type="email" endAdornment={<Icon name="mail" />} placeholder="nome@empresa.com.br" /></Field>
          <Field><Label>Usuário</Label><Input startAdornment="@" placeholder="usuario" /><FieldDescription>Sem o @.</FieldDescription></Field>
          <Field><Label>Endereço do site</Label><Input startAdornment="https://" endAdornment=".com.br" placeholder="empresa" /></Field>
          <Field><Label>Prazo</Label><TooltipProvider><Input inputMode="numeric" numeric defaultValue="30" endAdornment={<><span>dias</span><Tooltip content="Contado a partir da criação do negócio."><Button type="button" size="sm" iconOnly variant="ghost" icon={<Icon name="info" />} aria-label="Ajuda sobre prazo" /></Tooltip></>} /></TooltipProvider></Field>
          <Field><Label>Busca com limpar</Label><ComLimpar /></Field>
          <Field disabled><Label>Desabilitado</Label><Input startAdornment={<Icon name="lock" />} defaultValue="Somente administradores" /></Field>
        </Mesa>
      </Secao>
    </Prancha>
  ),
};

export const Numeros: Story = {
  name: "Números",
  render: () => (
    <Prancha>
      <Secao titulo="Valor numérico" descricao="numeric usa Geist Mono tabular, para dígitos alinharem em coluna. Para dinheiro, porcentagem e documento use os campos com máscara.">
        <Fileira rotulo="Comparar" coluna>
          <Input aria-label="Quantidade texto" defaultValue="1.250" />
          <Input aria-label="Quantidade numérica" numeric defaultValue="1.250" />
        </Fileira>
      </Secao>
    </Prancha>
  ),
};

export const Foco: Story = {
  args: { defaultValue: "Ana Souza" },
  play: ({ canvasElement }) => {
    canvasElement.querySelector("input")?.focus();
  },
};
