import { useMemo, useState } from "react";
import { Link, redirect, useNavigate, useSearchParams } from "react-router";
import { useLiveQuery } from "@tanstack/react-db";
import { buildCrmDashboard, formatBRL } from "@spark/core";
import { syncedAmount } from "@spark/data";
import { ActionCard, ActionCardGroup, Button, DashboardGrid, DataChart, DonutChart, EmptyState, Icon, MetricCard, PageFrame, PageHeader, Select } from "@spark/ui-web";
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
  const [searchParams] = useSearchParams();
  const session = getSession();
  const canReadContacts = session?.capabilities.includes("contacts:read") ?? false;
  const canImportContacts = session?.capabilities.includes("contacts:write") ?? false;
  const canReadDeals = session?.capabilities.includes("deals:read") ?? false;
  const canReadActivities = session?.capabilities.includes("activities:read") ?? false;
  const requestedView = searchParams.get("view");
  const view = requestedView === "people" && canReadContacts ? "people"
    : requestedView === "deals" && canReadDeals ? "deals"
      : requestedView === "activities" && canReadActivities ? "activities" : "overview";
  const showPeople = view === "overview" || view === "people";
  const showDeals = view === "overview" || view === "deals";
  const showActivities = view === "overview" || view === "activities";
  const viewTitle = ({ overview: "Visão geral", people: "Pessoas", deals: "Negócios", activities: "Atividades" } as const)[view];
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
  const visibleRecords = view === "people" ? contacts.length > 0 : view === "deals" ? deals.length > 0 : view === "activities" ? activities.length > 0 : hasRecords;
  const hasMetrics = canReadContacts || canReadDeals || canReadActivities;
  const firstRun = hasMetrics && !loading && !visibleRecords;
  const chartData = snapshot.days.map((day) => ({
    label: formatDay(day.date, periodDays),
    contatos: canReadContacts ? day.newContacts : null,
    negocios: canReadDeals ? day.newDeals : null,
    atividades: canReadActivities ? day.activities : null,
  }));
  const chartSeries = [
    ...(canReadContacts && showPeople ? [{ key: "contatos", label: "Novas pessoas", color: 1 as const }] : []),
    ...(canReadDeals && showDeals ? [{ key: "negocios", label: "Novos negócios", color: 2 as const }] : []),
    ...(canReadActivities && showActivities ? [{ key: "atividades", label: "Atividades", color: 3 as const }] : []),
  ];

  return <PageFrame className={styles.page}>
    <PageHeader icon="chart" title={viewTitle} />
    {firstRun && <EmptyState variant="featured" icon="chart" title="Os relatórios começam com seus registros" description="Cadastre pessoas, acompanhe negócios e agende atividades. O desempenho da equipe aparece aqui automaticamente." action={canImportContacts ? <Button onClick={() => void navigate("/contacts/import")}>Importar pessoas</Button> : undefined} />}
    {!hasMetrics && <EmptyState icon="chart" title="Indicadores indisponíveis" description="Seu grupo de acesso ainda não permite consultar pessoas, negócios ou atividades." />}
    {firstRun && <ActionCardGroup title="Acompanhe o trabalho da equipe">
      {canReadContacts && <ActionCard icon="team" title="Pessoas" description="Veja quem entrou na base e como o relacionamento evolui." action={<Button variant="secondary" onClick={() => void navigate("/")}>Abrir Leads</Button>} />}
      {canReadDeals && <ActionCard icon="briefcase" title="Oportunidades" description="Acompanhe o valor e o andamento dos negócios no funil." action={<Button variant="secondary" onClick={() => void navigate("/deals")}>Abrir CRM</Button>} />}
      {canReadActivities && <ActionCard icon="calendar" title="Compromissos" description="Veja tarefas, reuniões e ligações da equipe em uma agenda." action={<Button variant="secondary" onClick={() => void navigate("/activities")}>Abrir atividades</Button>} />}
    </ActionCardGroup>}
    {hasMetrics && !firstRun && <>
      <div className={styles.reportFilters}>
        <span className={styles.filterLabel}><Icon name="calendar" />Período</span>
        <div className={styles.period}><Select appearance="filter" label="Período do relatório" value={period} options={PERIODS} onValueChange={(value) => { if (value !== null) setPeriod(value); }} /></div>
      </div>
      <div className={styles.sectionHeading}><h2>{view === "overview" ? "Desempenho" : `Desempenho de ${viewTitle.toLocaleLowerCase("pt-BR")}`}</h2><span>Indicadores do período selecionado</span></div>
      <DashboardGrid metrics>
      {canReadContacts && showPeople && <Link className={styles.metricLink} to="/"><MetricCard title="Pessoas na base" value={snapshot.totalContacts} comparison={newContactsComparison(snapshot.newContacts, snapshot.newContactsChange, periodDays)} sentiment={(snapshot.newContactsChange ?? 0) >= 0 ? "positive" : "negative"} state={loadingContacts ? "loading" : "ready"} /></Link>}
      {canReadContacts && view === "people" && <Link className={styles.metricLink} to="/?status=new"><MetricCard title="Novas pessoas no período" value={snapshot.newContacts} comparison={`${periodDays} dias selecionados`} state={loadingContacts ? "loading" : "ready"} /></Link>}
      {canReadDeals && showDeals && <Link className={styles.metricLink} to="/deals"><MetricCard title="Negócios em aberto" value={snapshot.openDeals} comparison={formatBRL(snapshot.openPipelineAmount)} state={loadingDeals ? "loading" : "ready"} /></Link>}
      {canReadDeals && view === "deals" && <Link className={styles.metricLink} to="/deals"><MetricCard title="Valor em negociação" value={formatBRL(snapshot.openPipelineAmount)} comparison="Negócios em aberto" state={loadingDeals ? "loading" : "ready"} /></Link>}
      {canReadActivities && showActivities && <Link className={styles.metricLink} to="/activities"><MetricCard title="Atividades atrasadas" value={snapshot.overdueActivities} comparison="Pendências anteriores a hoje" sentiment={snapshot.overdueActivities > 0 ? "negative" : "positive"} state={loadingActivities ? "loading" : "ready"} /></Link>}
      {canReadActivities && showActivities && <Link className={styles.metricLink} to="/activities"><MetricCard title="Conclusão no período" value={snapshot.activityCompletionRate === null ? "—" : `${snapshot.activityCompletionRate}%`} comparison={`${periodDays} dias selecionados`} sentiment={(snapshot.activityCompletionRate ?? 0) >= 80 ? "positive" : "neutral"} state={loadingActivities ? "loading" : "ready"} /></Link>}
      </DashboardGrid>
    </>}
    {hasMetrics && !firstRun && <>
      <div className={styles.sectionHeading}><h2>Movimento no período</h2><span>Novos registros e atividades por dia</span></div>
      <DashboardGrid>
        <div className={styles.wideChart}><DataChart title="Evolução diária" description={view === "overview" ? "Pessoas, negócios e atividades" : viewTitle} data={chartData} series={chartSeries} kind="area" state={loading ? "loading" : visibleRecords ? "ready" : "empty"} /></div>
      </DashboardGrid>
      {view !== "activities" && <><div className={styles.sectionHeading}><h2>Distribuição</h2><span>Como os registros estão organizados agora</span></div>
      <DashboardGrid>
        {canReadDeals && showDeals && <DonutChart title="Negócios por situação" state={loadingDeals ? "loading" : deals.length ? "ready" : "empty"} data={[
        { id: "open", label: "Em aberto", value: snapshot.dealsByStatus.open, color: 1 },
        { id: "won", label: "Ganhos", value: snapshot.dealsByStatus.won, color: 2 },
        { id: "lost", label: "Perdidos", value: snapshot.dealsByStatus.lost, color: 4 },
        ]} />}
        {canReadContacts && showPeople && <DonutChart title="Pessoas por etapa" state={loadingContacts ? "loading" : contacts.length ? "ready" : "empty"} data={[
        { id: "new", label: "Novos", value: snapshot.contactsByStatus.new, color: 1 },
        { id: "qualified", label: "Qualificados", value: snapshot.contactsByStatus.qualified, color: 2 },
        { id: "nurturing", label: "Em nutrição", value: snapshot.contactsByStatus.nurturing, color: 3 },
        { id: "customer", label: "Clientes", value: snapshot.contactsByStatus.customer, color: 5 },
        { id: "unqualified", label: "Desqualificados", value: snapshot.contactsByStatus.unqualified, color: 4 },
        ]} />}
      </DashboardGrid></>}
    </>}
  </PageFrame>;
}

function formatDay(value: string, periodDays: number): string {
  return new Intl.DateTimeFormat("pt-BR", periodDays > 7 ? { day: "2-digit", month: "2-digit" } : { weekday: "short" }).format(new Date(`${value}T12:00:00`));
}

function newContactsComparison(count: number, change: number | null, days: number): string {
  if (change === null) return `${count} novas nos últimos ${days} dias`;
  if (change === 0) return `${count} novas · igual ao período anterior`;
  return `${count} novas · ${change > 0 ? "+" : ""}${change}% ante o período anterior`;
}
