import { useMemo, useState } from "react";
import { redirect, useNavigate } from "react-router";
import { useLiveQuery } from "@tanstack/react-db";
import { buildCrmDashboard, formatBRL } from "@spark/core";
import { syncedAmount } from "@spark/data";
import { Button, DashboardGrid, DashboardToolbar, DataChart, DonutChart, MetricCard, PageHeader } from "@spark/ui-web";
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
    <PageHeader eyebrow="Visão geral" title="Dashboard" description="Acompanhe o trabalho comercial com os dados atuais da sua organização." />
    <DashboardToolbar title="Desempenho comercial" period={period} periods={PERIODS} onPeriodChange={setPeriod} />
    <DashboardGrid metrics>
      {canReadContacts && <MetricCard title="Contatos ativos" value={snapshot.totalContacts} comparison={newContactsComparison(snapshot.newContacts, snapshot.newContactsChange, periodDays)} sentiment={(snapshot.newContactsChange ?? 0) >= 0 ? "positive" : "negative"} state={loadingContacts ? "loading" : "ready"} />}
      {canReadDeals && <MetricCard title="Negócios em aberto" value={snapshot.openDeals} comparison={formatBRL(snapshot.openPipelineAmount)} state={loadingDeals ? "loading" : "ready"} />}
      {canReadActivities && <MetricCard title="Atividades atrasadas" value={snapshot.overdueActivities} comparison="Pendências anteriores a hoje" sentiment={snapshot.overdueActivities > 0 ? "negative" : "positive"} state={loadingActivities ? "loading" : "ready"} />}
      {canReadActivities && <MetricCard title="Conclusão no período" value={snapshot.activityCompletionRate === null ? "—" : `${snapshot.activityCompletionRate}%`} comparison={`${periodDays} dias selecionados`} sentiment={(snapshot.activityCompletionRate ?? 0) >= 80 ? "positive" : "neutral"} state={loadingActivities ? "loading" : "ready"} />}
    </DashboardGrid>
    <DashboardGrid>
      <DataChart title="Movimento no período" description="Novos registros e atividades agendadas por dia" data={chartData} series={chartSeries} kind="area" state={loading ? "loading" : "ready"} />
      {canReadDeals && <DonutChart title="Negócios por situação" state={loadingDeals ? "loading" : "ready"} data={[
        { id: "open", label: "Em aberto", value: snapshot.dealsByStatus.open, color: 1 },
        { id: "won", label: "Ganhos", value: snapshot.dealsByStatus.won, color: 2 },
        { id: "lost", label: "Perdidos", value: snapshot.dealsByStatus.lost, color: 4 },
      ]} />}
      {canReadContacts && <DonutChart title="Contatos por etapa" state={loadingContacts ? "loading" : "ready"} data={[
        { id: "new", label: "Novos", value: snapshot.contactsByStatus.new, color: 1 },
        { id: "qualified", label: "Qualificados", value: snapshot.contactsByStatus.qualified, color: 2 },
        { id: "nurturing", label: "Em nutrição", value: snapshot.contactsByStatus.nurturing, color: 3 },
        { id: "customer", label: "Clientes", value: snapshot.contactsByStatus.customer, color: 5 },
        { id: "unqualified", label: "Desqualificados", value: snapshot.contactsByStatus.unqualified, color: 4 },
      ]} />}
    </DashboardGrid>
    <div className={styles.shortcuts}>
      {canReadContacts && <Button variant="secondary" onClick={() => navigate("/")}>Abrir contatos</Button>}
      {canReadDeals && <Button variant="secondary" onClick={() => navigate("/deals")}>Abrir negócios</Button>}
      {canReadActivities && <Button variant="secondary" onClick={() => navigate("/activities")}>Abrir atividades</Button>}
    </div>
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
