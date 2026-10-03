import type { Meta, StoryObj } from "@storybook/react-vite";
import { money, type CashCurrency, type Money } from "@spark/core";
import { useState } from "react";
import { Field } from "../Field/Field.js";
import { Label } from "../Label/Label.js";
import { Select } from "../Select/Select.js";
import { Mesa, Prancha, Secao } from "../storybook/Prancha.js";
import { ChangeCalculator } from "./ChangeCalculator.js";

function Calculadora() {
  const [moeda, setMoeda] = useState<CashCurrency>("BRL");
  const [total, setTotal] = useState<Money | null>(money(3540));
  const [recebido, setRecebido] = useState<Money | null>(money(5000));
  const [centavo, setCentavo] = useState(false);
  return (
    <Mesa largura={480}>
      <Field><Label>Moeda do troco</Label><Select label="Moeda do troco" value={moeda} options={[{ value: "BRL", label: "Real brasileiro" }, { value: "USD", label: "Dólar americano" }]} onValueChange={valor => { if (valor === "BRL" || valor === "USD") { setMoeda(valor); setTotal(null); setRecebido(null); setCentavo(valor === "USD"); } }} /></Field>
      <ChangeCalculator currency={moeda} total={total} received={recebido} onTotalChange={setTotal} onReceivedChange={setRecebido} includeOneCent={centavo} onIncludeOneCentChange={setCentavo} />
    </Mesa>
  );
}

const meta: Meta<typeof ChangeCalculator> = {
  title: "Campos/Calculadora de troco",
  component: ChangeCalculator,
  parameters: { docs: { description: { component: "Total e valor recebido em dinheiro; o troco sai em notas e moedas, com o desenho de cada peça. Valores em centavos (Money)." } } },
};

export default meta;
type Story = StoryObj<typeof ChangeCalculator>;

export const Interativo: Story = { render: () => <Prancha><Secao titulo="Troco no caixa"><Calculadora /></Secao></Prancha> };
