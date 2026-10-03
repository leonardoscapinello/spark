import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Fileira, Matriz, Mesa, Prancha, Secao } from "../storybook/Prancha.js";
import { KpiCard } from "./KpiCard.js";

const SERIE = [42, 48, 45, 53, 51, 58, 62, 60, 66, 71, 69, 75, 80, 78];

const meta: Meta<typeof KpiCard> = {
  title: "Dados/KPI",
  component: KpiCard,
  args: { label: "Receita", value: "R$ 184.320", delta: { label: "+12,4%", tone: "positive", direction: "up" }, hint: "Pedidos aprovados no período", trend: SERIE, state: "ready" },
  argTypes: { state: { control: "inline-radio", options: ["ready", "loading", "error"] } },
};
export default meta;
type Story = StoryObj<typeof KpiCard>;

export const Interativo: Story = { render: (args) => <Mesa largura={280}><KpiCard {...args} /></Mesa> };

export const Variantes: Story = { render: () => <Prancha>
  <Secao titulo="Variação × linha fina" descricao="A cor da variação segue o que é bom ou ruim, não o sinal: CAC caindo é positivo.">
    <Matriz colunas={["Com linha fina", "Sem linha fina"]} linhas={[
      { rotulo: "Positiva", celulas: [<KpiCard label="Receita" value="R$ 184.320" delta={{ label: "+12,4%", tone: "positive", direction: "up" }} trend={SERIE} />, <KpiCard label="Receita" value="R$ 184.320" delta={{ label: "+12,4%", tone: "positive", direction: "up" }} />] },
      { rotulo: "Positiva caindo", celulas: [<KpiCard label="CAC" value="R$ 38,20" delta={{ label: "−6,1%", tone: "positive", direction: "down" }} trend={[...SERIE].reverse()} />, <KpiCard label="CAC" value="R$ 38,20" delta={{ label: "−6,1%", tone: "positive", direction: "down" }} />] },
      { rotulo: "Negativa", celulas: [<KpiCard label="Reembolsos" value="R$ 2.140" delta={{ label: "+3,2%", tone: "negative", direction: "up" }} trend={SERIE} />, <KpiCard label="Reembolsos" value="R$ 2.140" delta={{ label: "+3,2%", tone: "negative", direction: "up" }} />] },
      { rotulo: "Neutra", celulas: [<KpiCard label="Pessoas na base" value="1.284" delta={{ label: "0%", tone: "neutral" }} trend={SERIE} />, <KpiCard label="Pessoas na base" value="1.284" hint="Igual ao período anterior" />] },
    ]} />
  </Secao>
  <Secao titulo="Estados">
    <Fileira rotulo="Carregando" topo><Mesa largura={260}><KpiCard label="Conversas" value="" state="loading" /></Mesa></Fileira>
    <Fileira rotulo="Com erro" topo><Mesa largura={260}><KpiCard label="Conversas" value="" state="error" onRetry={() => undefined} /></Mesa></Fileira>
    <Fileira rotulo="Zero é valor" topo><Mesa largura={260}><KpiCard label="Atividades atrasadas" value={0} hint="Nenhuma pendência" /></Mesa></Fileira>
    <Fileira rotulo="Clicável" topo><Mesa largura={260}><KpiCard label="Negócios em aberto" value="12" hint="R$ 84.000 em negociação" render={<a href="#negocios" />} /></Mesa></Fileira>
  </Secao>
</Prancha> };

function Odometro() {
  const [valor, setValor] = useState(184320);
  return <Mesa largura={280}><KpiCard label="Receita ao vivo — clique para somar" value={`R$ ${valor.toLocaleString("pt-BR")}`} trend={SERIE} render={<a href="#receita" onClick={(event) => { event.preventDefault(); setValor((atual) => atual + Math.round(Math.random() * 1400)); }} />} /></Mesa>;
}
export const OdometroRolando: Story = { render: () => <Odometro /> };
export const ValorLongo: Story = { render: () => <Mesa largura={200}><KpiCard label="Valor em negociação no trimestre corrente" value="R$ 12.345.678,90" hint="Negócios em aberto" /></Mesa> };
