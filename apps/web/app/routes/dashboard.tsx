import { useMemo, useState } from "react";
import { Link, redirect, useNavigate } from "react-router";
import { useLiveQuery } from "@tanstack/react-db";
import { buildCrmDashboard, formatBRL } from "@spark/core";
import { syncedAmount } from "@spark/data";
import { Button, DashboardGrid, DataChart, DonutChart, EmptyState, Icon, MetricCard, PageHeader, Select } from "@spark/ui-web";
import { getActivitiesCollection } from "../lib/activities-collection.client";
import { getContactsCollection } from "../lib/contacts-collection.client";
import { getDealsCollection } from "../lib/deals-collections.client";
import { getSession, restoreSession } from "../lib/auth.client";
import styles from "./dashboard.module.css";

const PERIODS = [
  { value: "7", label: "Últimos 7 dias" },
  { value: "28", label: "Últimas 4 semanas" },
] as const;

export async function clientLoader() {
  const session = await restoreSession();
  if (!session) throw redirect("/login");
  void Promise.allSettled([
    ...(session.capabilities.includes("contacts:read") ? [getContactsCollection().preload()] : []),
    ...(session.capabilities.includes("deals:read") ? [getDealsCollection().preload()] : []),
    ...(session.capabilities.includes("activities:read") ? [getActivitiesCollection().preload()] : []),
  ]);
  return null;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const session = getSession();
  const canReadContacts = session?.capabilities.includes("contacts:read") ?? false;
  const canReadDeals = session?.capabilities.includes("deals:read") ?? false;
  const canReadActivities = session?.capabilities.includes("activities:read") ?? false;
  const { data: contacts = [], isLoading: loadingContacts } = useLiveQuery({ query: (q) => canReadContacts ? q.from({ contacts: getContactsCollection() }) : undefined });
  const { data: deals = [], isLoading: loadingDeals } = useLiveQuery({ query: (q) => canReadDeals ? q.from({ deals: getDealsCollection() }) : undefined });
  const { data: activities = [], isLoading: loadingActivities } = useLiveQuery({ query: (q) => canReadActivities ? q.from({ activities: getActivitiesCollection() }) : undefined });
  const [period, setPeriod] = useState("7");
  const periodDays = Number(period);
  const snapshot = useMemo(() => buildCrmDashboard({
    contacts,
    deals: deals.map((deal) => ({ ...deal, amount: syncedAmount(deal.amount) })),
    activities,
    now: new Date(),
    periodDays,
  }), [activities, contacts, deals, periodDays]);
  const loading = loadingContacts || loadingDeals || loadingActivities;
  const hasRecords = contacts.length > 0 || deals.length > 0 || activities.length > 0;
  const hasMetrics = canReadContacts || canReadDeals || canReadActivities;
  const firstRun = hasMetrics && !loading && !hasRecords;
  const firstRoute = canReadContacts ? "/" : canReadDeals ? "/deals" : "/activities";
  const firstLabel = canReadContacts ? "Abrir Leads" : canReadDeals ? "Abrir CRM" : "Abrir Agenda";
  const chartData = snapshot.days.map((day) => ({
    label: formatDay(day.date, periodDays),
    contatos: canReadContacts ? day.newContacts : null,
    negocios: canReadDeals ? day.newDeals : null,
    atividades: canReadActivities ? day.activities : null,
  }));
  const chartSeries = [
    ...(canReadContacts ? [{ key: "contatos", label: "Novos contatos", color: 1 as const }] : []),
    ...(canReadDeals ? [{ key: "negocios", label: "Novos negócios", color: 2 as const }] : []),
    ...(canReadActivities ? [{ key: "atividades", label: "Atividades", color: 3 as const }] : []),
  ];

  return <div className={styles.page}>
    {firstRun && <EmptyState variant="featured" icon="chart" title="Os relatórios começam com seus registros" description="Cadastre contatos, acompanhe negócios e agende atividades. O desempenho da equipe aparece aqui automaticamente." action={<Button onClick={() => void navigate(firstRoute)}>{firstLabel}</Button>} />}
    <PageHeader icon="chart" title="Visão geral" />
    {!hasMetrics && <EmptyState icon="chart" title="Indicadores indisponíveis" description="Seu grupo de acesso ainda não permite consultar contatos, negócios ou atividades." />}
    {hasMetrics && <>
      <div className={styles.reportFilters}>
        <span className={styles.filterLabel}><Icon name="calendar" />Período</span>
        <div className={styles.period}><Select appearance="filter" label="Período do relatório" value={period} options={PERIODS} onValueChange={(value) => { if (value !== null) setPeriod(value); }} /></div>
      </div>
      <div className={styles.sectionHeading}><h2>Desempenho comercial</h2><span>Indicadores do período selecionado</span></div>
      <DashboardGrid metrics>
      {canReadContacts && <Link className={styles.metricLink} to="/"><MetricCard title="Contatos ativos" value={snapshot.totalContacts} comparison={newContactsComparison(snapshot.newContacts, snapshot.newContactsChange, periodDays)} sentiment={(snapshot.newContactsChange ?? 0) >= 0 ? "positive" : "negative"} state={loadingContacts ? "loading" : "ready"} /></Link>}
      {canReadDeals && <Link className={styles.metricLink} to="/deals"><MetricCard title="Negócios em aberto" value={snapshot.openDeals} comparison={formatBRL(snapshot.openPipelineAmount)} state={loadingDeals ? "loading" : "ready"} /></Link>}
      {canReadActivities && <Link className={styles.metricLink} to="/activities"><MetricCard title="Atividades atrasadas" value={snapshot.overdueActivities} comparison="Pendências anteriores a hoje" sentiment={snapshot.overdueActivities > 0 ? "negative" : "positive"} state={loadingActivities ? "loading" : "ready"} /></Link>}
      {canReadActivities && <Link className={styles.metricLink} to="/activities"><MetricCard title="Conclusão no período" value={snapshot.activityCompletionRate === null ? "—" : `${snapshot.activityCompletionRate}%`} comparison={`${periodDays} dias selecionados`} sentiment={(snapshot.activityCompletionRate ?? 0) >= 80 ? "positive" : "neutral"} state={loadingActivities ? "loading" : "ready"} /></Link>}
      </DashboardGrid>
    </>}
    {hasMetrics && <>
      <div className={styles.sectionHeading}><h2>Movimento no período</h2><span>Novos registros e atividades por dia</span></div>
      <DashboardGrid>
        <DataChart title="Evolução diária" description="Contatos, negócios e atividades" data={chartData} series={chartSeries} kind="area" state={loading ? "loading" : hasRecords ? "ready" : "empty"} />
      </DashboardGrid>
      <div className={styles.sectionHeading}><h2>Distribuição</h2><span>Como os registros estão organizados agora</span></div>
      <DashboardGrid>
        {canReadDeals && <DonutChart title="Negócios por situação" state={loadingDeals ? "loading" : deals.length ? "ready" : "empty"} data={[
        { id: "open", label: "Em aberto", value: snapshot.dealsByStatus.open, color: 1 },
        { id: "won", label: "Ganhos", value: snapshot.dealsByStatus.won, color: 2 },
        { id: "lost", label: "Perdidos", value: snapshot.dealsByStatus.lost, color: 4 },
        ]} />}
        {canReadContacts && <DonutChart title="Contatos por etapa" state={loadingContacts ? "loading" : contacts.length ? "ready" : "empty"} data={[
        { id: "new", label: "Novos", value: snapshot.contactsByStatus.new, color: 1 },
        { id: "qualified", label: "Qualificados", value: snapshot.contactsByStatus.qualified, color: 2 },
        { id: "nurturing", label: "Em nutrição", value: snapshot.contactsByStatus.nurturing, color: 3 },
        { id: "customer", label: "Clientes", value: snapshot.contactsByStatus.customer, color: 5 },
        { id: "unqualified", label: "Desqualificados", value: snapshot.contactsByStatus.unqualified, color: 4 },
        ]} />}
      </DashboardGrid>
    </>}
  </div>;
}

function formatDay(value: string, periodDays: number): string {
  return new Intl.DateTimeFormat("pt-BR", periodDays > 7 ? { day: "2-digit", month: "2-digit" } : { weekday: "short" }).format(new Date(`${value}T12:00:00`));
}

function newContactsComparison(count: number, change: number | null, days: number): string {
  if (change === null) return `${count} novos nos últimos ${days} dias`;
  if (change === 0) return `${count} novos · igual ao período anterior`;
  return `${count} novos · ${change > 0 ? "+" : ""}${change}% ante o período anterior`;
}
