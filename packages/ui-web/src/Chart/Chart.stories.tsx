import type { Meta, StoryObj } from "@storybook/react-vite";
import { Mesa, Prancha, Secao } from "../storybook/Prancha.js";
import { DataChart, DonutChart, type ChartDatum, type ChartSeries } from "./Chart.js";
import DashboardExamples from "./DashboardExamples.js";

const SEMANA: ChartDatum[] = [{ label: "Seg", atual: 1200, anterior: 950 }, { label: "Ter", atual: 1600, anterior: 1250 }, { label: "Qua", atual: 1450, anterior: 1300 }, { label: "Qui", atual: 1900, anterior: 1500 }, { label: "Sex", atual: 2100, anterior: 1700 }, { label: "Sáb", atual: 900, anterior: 800 }, { label: "Dom", atual: 700, anterior: 760 }];
const ATUAL: ChartSeries[] = [{ key: "atual", label: "Período atual", color: 1 }];
const COMPARACAO: ChartSeries[] = [{ key: "atual", label: "Período atual", color: 1 }, { key: "anterior", label: "Período anterior", color: 6, comparison: true }];
const CATEGORIAS: ChartSeries[] = [{ key: "pessoas", label: "Novas pessoas", color: 1 }, { key: "negocios", label: "Novos negócios", color: 2 }, { key: "atividades", label: "Atividades", color: 3 }];
const MOVIMENTO: ChartDatum[] = ["01/09", "02/09", "03/09", "04/09", "05/09", "06/09", "07/09"].map((label, index) => ({ label, pessoas: 4 + (index * 3) % 7, negocios: 2 + (index * 5) % 4, atividades: 6 + (index * 2) % 5 }));
const brl = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);

const meta: Meta<typeof DataChart> = {
  title: "Dados/Gráficos",
  component: DataChart,
  args: { title: "Receita diária", description: "Período atual contra o anterior", data: SEMANA, series: COMPARACAO, kind: "line", stacked: false, state: "ready", formatValue: brl },
  argTypes: { kind: { control: "inline-radio", options: ["line", "area", "bar"] }, state: { control: "inline-radio", options: ["ready", "loading", "empty", "error"] } },
};
export default meta;
type Story = StoryObj<typeof DataChart>;

export const Interativo: Story = {};

export const Variantes: Story = { render: () => <Prancha>
  <Secao titulo="Série" descricao="Uma série: só tinta. Comparação: tinta + Hai tracejado. Categorias: Identidade, Ai, Asagi, Kaki, Fuji.">
    <DataChart title="Linha com comparação" data={SEMANA} series={COMPARACAO} formatValue={brl} />
    <DataChart title="Área" data={SEMANA} series={ATUAL} kind="area" formatValue={brl} />
    <DataChart title="Categorias" data={MOVIMENTO} series={CATEGORIAS} kind="area" />
  </Secao>
  <Secao titulo="Barras" descricao="Uma série: papel cavado e a barra sob o ponteiro (ou a última) em tinta.">
    <DataChart title="Receita por dia" data={SEMANA} series={ATUAL} kind="bar" formatValue={brl} />
    <DataChart title="Várias séries" data={MOVIMENTO} series={CATEGORIAS} kind="bar" />
    <DataChart title="Empilhadas" data={MOVIMENTO} series={CATEGORIAS} kind="bar" stacked />
  </Secao>
  <Secao titulo="Rosca">
    <DonutChart title="Vendas por fonte" formatValue={brl} data={[{ id: "meta", label: "Meta Ads", value: 88474, color: 1 }, { id: "google", label: "Google Ads", value: 49766, color: 2 }, { id: "tiktok", label: "TikTok Ads", value: 27648, color: 3 }, { id: "organico", label: "Orgânico", value: 18432, color: 6 }]} />
    <DonutChart title="Sem ocorrências" data={[{ id: "a", label: "Ganhos", value: 0, color: 1 }, { id: "b", label: "Perdidos", value: 0, color: 6 }]} />
  </Secao>
</Prancha> };

export const Vazio: Story = { args: { data: [] } };
export const Carregando: Story = { args: { state: "loading" } };
export const Erro: Story = { args: { state: "error", onRetry: () => undefined } };
export const RoscaCarregando: Story = { render: () => <DonutChart title="Negócios por situação" data={[]} state="loading" /> };
export const MuitosPontos: Story = { args: { title: "28 dias", data: Array.from({ length: 28 }, (_, index) => ({ label: `${String(index + 1).padStart(2, "0")}/09`, atual: 40000 + Math.round(Math.sin(index / 3) * 9000 + index * 600), anterior: 36000 + Math.round(Math.cos(index / 4) * 7000 + index * 400) })) } };
export const Estreito: Story = { render: () => <Mesa largura={320}><DataChart title="Receita diária" data={SEMANA} series={COMPARACAO} formatValue={brl} /></Mesa> };
export const PainelCompleto: Story = { render: () => <DashboardExamples /> };
