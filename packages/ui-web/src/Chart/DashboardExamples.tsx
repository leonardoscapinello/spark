import { useState } from "react";
import { DataChart, DonutChart, type ChartDatum, type ChartSeries } from "./Chart.js";
import { Card, ProgressCard, SummaryList } from "../Card/Card.js";
import { DashboardGrid, DashboardToolbar, KpiCard } from "../Dashboard/Dashboard.js";
import { MenuButton, MenuItem } from "../Menu/Menu.js";
import { Text } from "../Text/Text.js";
import s from "./DashboardExamples.module.css";
const series: ChartSeries[] = [{key:"received",label:"Recebidas",color:1},{key:"closed",label:"Resolvidas",color:2}];
const week: ChartDatum[] = [{label:"Seg",received:42,closed:35},{label:"Ter",received:58,closed:46},{label:"Qua",received:48,closed:51},{label:"Qui",received:72,closed:63},{label:"Sex",received:65,closed:58},{label:"Sáb",received:30,closed:27},{label:"Dom",received:25,closed:24}];
const month: ChartDatum[] = [{label:"Semana 1",received:340,closed:304},{label:"Semana 2",received:380,closed:350},{label:"Semana 3",received:420,closed:394},{label:"Semana 4",received:368,closed:341}];
export default function DashboardExamples() {
  const [period,setPeriod] = useState("week");
  const [recovered,setRecovered] = useState(false);
  const [view,setView] = useState<"line"|"bar">("line");
  return <div className={s.root}>
    <DashboardToolbar title="Componentes de dashboard" period={period} periods={[{value:"week",label:"Últimos 7 dias"},{value:"month",label:"Últimas 4 semanas"}]} onPeriodChange={setPeriod} />
    <Text as="p" size="pequeno" tone="secondary">Dados ilustrativos para exercitar os componentes. O período altera o conjunto exibido.</Text>
    <DashboardGrid metrics><KpiCard label="Novas conversas" value={period==="week"?"340":"1.508"} delta={{label:"+12,4%",tone:"positive",direction:"up"}} trend={week.map(day=>Number(day.received))} /><KpiCard label="Primeira resposta" value="2 min 34 s" delta={{label:"−18 s",tone:"positive",direction:"down"}} /><KpiCard label="Satisfação" value="96,8%" hint="Avaliações recebidas" /><KpiCard label="Conversas abertas" value="24" hint="8 aguardando atribuição" /></DashboardGrid>
    <DashboardGrid>
      <DataChart title="Volume de conversas" description="Conversas recebidas e resolvidas por período" data={period==="week"?week:month} series={series} kind={view} actions={<MenuButton variant="ghost" size="sm" menu={<><MenuItem onClick={()=>setView("line")}>Linhas</MenuItem><MenuItem onClick={()=>setView("bar")}>Barras</MenuItem></>}>Visualização</MenuButton>} />
      <DataChart title="Comparação por período" data={period==="week"?week:month} series={series} kind="bar" />
      <DataChart title="Evolução de recebimentos" data={period==="week"?week:month} series={[series[0]!]} kind="area" />
      <DonutChart title="Conversas por canal" data={[{id:"email",label:"E-mail",value:180,color:1},{id:"instagram",label:"Instagram",value:95,color:2},{id:"whatsapp",label:"WhatsApp",value:65,color:3}]} />
      <DataChart title="Distribuição acumulada" data={period==="week"?week:month} series={series} kind="bar" stacked />
      <Card title="Desempenho por equipe" description="Valores recebidos do módulo de relatórios"><SummaryList label="Equipes" items={[{id:"support",label:"Atendimento",detail:"Conversas resolvidas",value:"204"},{id:"sales",label:"Vendas",detail:"Conversas resolvidas",value:"86"},{id:"success",label:"Sucesso do cliente",detail:"Conversas resolvidas",value:"50"}]} /></Card>
      <ProgressCard title="Meta de atendimento" value={84} label="84% da meta concluída" footer="Meta e progresso fornecidos pela aplicação" />
      <KpiCard label="Carregando indicador" value="" state="loading" />
      <DataChart title="Carregando gráfico" data={[]} series={series} state="loading" />
      <DonutChart title="Carregando distribuição" data={[]} state="loading" />
      <DataChart title="Sem dados no período" data={[]} series={series} />
      <KpiCard label="Recuperação de falha" value="340" state={recovered?"ready":"error"} onRetry={()=>setRecovered(true)} />
    </DashboardGrid>
  </div>;
}
