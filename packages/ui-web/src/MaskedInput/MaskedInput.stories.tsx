import type { Meta, StoryObj } from "@storybook/react-vite";
import { money, toCents, type Money } from "@spark/core";
import { useState } from "react";
import { Field } from "../Field/Field.js";
import { FieldDescription } from "../Form/Form.js";
import { Label } from "../Label/Label.js";
import { Fileira, Mesa, Prancha, Secao } from "../storybook/Prancha.js";
import { DocumentInput, MaskedInput, MoneyInput, PercentInput, PhoneInput, type PhoneCountry, type PhoneDraft } from "./MaskedInput.js";

const PAISES = (numero: string): readonly PhoneCountry[] => [
  { id: "BR", label: "Brasil", dialCode: "+55", format: numero.length > 10 ? "(##) #####-####" : "(##) ####-#####" },
  { id: "US", label: "EUA", dialCode: "+1", format: "(###) ###-####" },
  { id: "PT", label: "Portugal", dialCode: "+351", format: "### ### ###" },
];

function Documento({ inicial, rotulo }: { inicial: string; rotulo: string }) {
  const [valor, setValor] = useState(inicial);
  return (
    <Field>
      <Label>{rotulo}</Label>
      <DocumentInput label={rotulo} value={valor} onValueChange={setValor} />
      <FieldDescription>{valor.length > 11 ? "CNPJ" : "CPF"} · dígitos entregues: {valor || "nenhum"}</FieldDescription>
    </Field>
  );
}

function Telefone({ inicial }: { inicial: PhoneDraft }) {
  const [valor, setValor] = useState(inicial);
  return <PhoneInput label="Telefone" value={valor} onValueChange={setValor} countries={PAISES(valor.nationalNumber)} />;
}

function Dinheiro({ inicial, moeda = "BRL", desabilitado = false }: { inicial: Money | null; moeda?: "BRL" | "USD"; desabilitado?: boolean }) {
  const [valor, setValor] = useState(inicial);
  return (
    <Field disabled={desabilitado}>
      <Label>Valor {moeda === "USD" ? "em dólar" : "em reais"}</Label>
      <MoneyInput label="Valor" currency={moeda} value={valor} onValueChange={setValor} disabled={desabilitado} />
      <FieldDescription>{valor === null ? "Vazio" : `${toCents(valor)} centavos`}</FieldDescription>
    </Field>
  );
}

function Porcentagem({ inicial }: { inicial: number | null }) {
  const [valor, setValor] = useState(inicial);
  return (
    <Field>
      <Label>Probabilidade</Label>
      <PercentInput label="Probabilidade" value={valor} onValueChange={setValor} />
      <FieldDescription>{valor === null ? "Vazio" : `${valor} pontos-base`}</FieldDescription>
    </Field>
  );
}

function Padrao({ rotulo, formato, exemplo }: { rotulo: string; formato: string; exemplo: string }) {
  const [valor, setValor] = useState("");
  return (
    <Field>
      <Label>{rotulo}</Label>
      <MaskedInput aria-label={rotulo} format={formato} placeholder={exemplo} value={valor} onValueChange={setValor} />
    </Field>
  );
}

function Mascaras() {
  return (
    <Prancha>
      <Secao titulo="CPF e CNPJ" descricao="Um campo só: até 11 dígitos é CPF, a partir do 12º vira CNPJ. O valor entregue são só os dígitos.">
        <Mesa>
          <Documento rotulo="CPF ou CNPJ" inicial="" />
          <Documento rotulo="CPF preenchido" inicial="12345678909" />
          <Documento rotulo="CNPJ preenchido" inicial="11222333000181" />
        </Mesa>
      </Secao>
      <Secao titulo="Telefone" descricao="DDI no seletor, número com a máscara do país. Celular brasileiro ganha o nono dígito sozinho.">
        <Mesa largura={440}>
          <Telefone inicial={{ country: "BR", nationalNumber: "" }} />
          <Telefone inicial={{ country: "BR", nationalNumber: "11987654321" }} />
          <Telefone inicial={{ country: "US", nationalNumber: "4155550100" }} />
        </Mesa>
      </Secao>
      <Secao titulo="Dinheiro" descricao="Digitado da direita para a esquerda, como em caixa: 9 e 0 viram R$ 0,90. O valor é sempre inteiro em centavos (Money).">
        <Mesa>
          <Dinheiro inicial={null} />
          <Dinheiro inicial={money(125000)} />
          <Dinheiro inicial={money(9990)} moeda="USD" />
          <Dinheiro inicial={money(50000)} desabilitado />
        </Mesa>
      </Secao>
      <Secao titulo="Porcentagem" descricao="Guardada em pontos-base: 12,5 % é 1250.">
        <Mesa>
          <Porcentagem inicial={null} />
          <Porcentagem inicial={6250} />
        </Mesa>
      </Secao>
      <Secao titulo="Máscara livre" descricao="Para formatos fixos: CEP, data digitada, placa, código.">
        <Mesa>
          <Padrao rotulo="CEP" formato="#####-###" exemplo="00000-000" />
          <Padrao rotulo="Data de nascimento" formato="##/##/####" exemplo="dd/mm/aaaa" />
          <Padrao rotulo="Código de verificação" formato="### ###" exemplo="000 000" />
        </Mesa>
      </Secao>
      <Secao titulo="Todos juntos" descricao="Mesma pílula, mesma altura, mesma tinta: máscara é comportamento, não aparência.">
        <Fileira rotulo="Lado a lado" coluna>
          <DocumentInput label="Documento" value="12345678909" onValueChange={() => undefined} />
          <MoneyInput label="Valor" value={money(125000)} onValueChange={() => undefined} />
          <PercentInput label="Desconto" value={1000} onValueChange={() => undefined} />
        </Fileira>
      </Secao>
    </Prancha>
  );
}

const meta = {
  title: "Campos/Máscaras",
  component: MaskedInput,
  subcomponents: { DocumentInput, PhoneInput, MoneyInput, PercentInput },
  parameters: {
    docs: { description: { component: "Campos com máscara: CPF/CNPJ, telefone, dinheiro, porcentagem e formatos livres. São o mesmo campo de texto; a máscara só muda o que se digita e o valor entregue." } },
  },
} satisfies Meta<typeof MaskedInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Todas: Story = {
  name: "Todas as máscaras",
  args: { value: "", onValueChange: () => undefined, format: "#####-###" },
  render: () => <Mascaras />,
};
