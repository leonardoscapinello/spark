import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Mesa, Prancha, Secao } from "../storybook/Prancha.js";
import { DashboardGrid, DashboardToolbar, KpiCard } from "./Dashboard.js";

const meta: Meta<typeof DashboardGrid> = { title: "Dados/Painel", component: DashboardGrid, args: { metrics: true } };
export default meta;
type Story = StoryObj<typeof DashboardGrid>;
const SERIE = [42, 48, 45, 53, 51, 58, 62, 60, 66, 71, 69, 75, 80, 78];
const KPIS = [
  { label: "Receita", value: "R$ 184.320", delta: { label: "+12,4%", tone: "positive" as const, direction: "up" as const } },
  { label: "CAC", value: "R$ 38,20", delta: { label: "−6,1%", tone: "positive" as const, direction: "down" as const } },
  { label: "ROAS", value: "4,82x", delta: { label: "+0,6x", tone: "positive" as const, direction: "up" as const } },
  { label: "Reembolsos", value: "R$ 2.140", delta: { label: "+3,2%", tone: "negative" as const, direction: "up" as const } },
];

export const Interativo: Story = { render: (args) => <DashboardGrid {...args}>{KPIS.map((kpi) => <KpiCard key={kpi.label} {...kpi} trend={SERIE} />)}</DashboardGrid> };

function Periodo({ periodos }: { periodos: readonly { value: string; label: string }[] }) {
  const [periodo, setPeriodo] = useState(periodos[0]!.value);
  return <DashboardToolbar title="Desempenho" period={periodo} periods={periodos} onPeriodChange={setPeriodo} />;
}

export const Variantes: Story = { render: () => <Prancha>
  <Secao titulo="Grade de KPIs" descricao="minmax(220, 1fr), 12 de respiro.">
    <DashboardGrid metrics>{KPIS.map((kpi) => <KpiCard key={kpi.label} {...kpi} trend={SERIE} />)}</DashboardGrid>
  </Secao>
  <Secao titulo="Período" descricao="Até quatro períodos viram segmentado; mais que isso, lista.">
    <Periodo periodos={[{ value: "7", label: "7 dias" }, { value: "28", label: "4 semanas" }]} />
    <Periodo periodos={[{ value: "7", label: "7 dias" }, { value: "30", label: "30 dias" }, { value: "90", label: "90 dias" }, { value: "365", label: "12 meses" }, { value: "all", label: "Desde o início" }]} />
  </Secao>
</Prancha> };

export const MuitosIndicadores: Story = { render: () => <DashboardGrid metrics>{Array.from({ length: 10 }, (_, index) => <KpiCard key={index} label={`Indicador ${index + 1}`} value={(index * 137).toLocaleString("pt-BR")} hint="Período selecionado" />)}</DashboardGrid> };
export const Carregando: Story = { render: () => <DashboardGrid metrics>{KPIS.map((kpi) => <KpiCard key={kpi.label} label={kpi.label} value="" state="loading" />)}</DashboardGrid> };
export const Estreito: Story = { render: () => <Mesa largura={360}><DashboardGrid metrics>{KPIS.map((kpi) => <KpiCard key={kpi.label} {...kpi} />)}</DashboardGrid></Mesa> };
