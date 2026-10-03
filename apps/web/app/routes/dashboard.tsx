import { useMemo, useState } from "react";
import { Link, redirect, useNavigate, useSearchParams } from "react-router";
import { useLiveQuery } from "@tanstack/react-db";
import { buildCrmDashboard, buildInboxDashboard, formatBRL } from "@spark/core";
import { syncedAmount } from "@spark/data";
import { ActionCard, ActionCardGroup, Button, DashboardGrid, DataChart, DonutChart, EmptyState, KpiCard, PageFrame, PageHeader, PageState, SectionTitle, SegmentedControl, type KpiDelta } from "@spark/ui-web";
import { getActivitiesCollection } from "../lib/activities-collection.client";
import { getContactsCollection } from "../lib/contacts-collection.client";
import { getDealsCollection } from "../lib/deals-collections.client";
import { getConversationsCollection } from "../lib/inbox-collections.client";
import { getSession, restoreSession } from "../lib/auth.client";
import styles from "./dashboard.module.css";

type Period = "7" | "28";
const PERIODS: readonly { value: Period; label: string }[] = [
  { value: "7", label: "7 dias" },
  { value: "28", label: "4 semanas" },
];

export async function clientLoader() {
  const session = await restoreSession();
  if (!session) throw redirect("/login");
  void Promise.allSettled([
    ...(session.capabilities.includes("contacts:read") ? [getContactsCollection().preload()] : []),
    ...(session.capabilities.includes("deals:read") ? [getDealsCollection().preload()] : []),
    ...(session.capabilities.includes("activities:read") ? [getActivitiesCollection().preload()] : []),
    ...(session.capabilities.includes("inbox:read") ? [getConversationsCollection().preload()] : []),
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
  const canReadInbox = session?.capabilities.includes("inbox:read") ?? false;
  const requestedView = searchParams.get("view");
  const view = requestedView === "people" && canReadContacts ? "people"
    : requestedView === "deals" && canReadDeals ? "deals"
      : requestedView === "activities" && canReadActivities ? "activities"
        : requestedView === "inbox" && canReadInbox ? "inbox" : "overview";
  const showPeople = view === "overview" || view === "people";
  const showDeals = view === "overview" || view === "deals";
  const showActivities = view === "overview" || view === "activities";
  const viewTitle = ({ overview: "Visão geral", people: "Pessoas", deals: "Negócios", activities: "Atividades", inbox: "Atendimento" } as const)[view];
  const { data: contacts = [], isLoading: loadingContacts } = useLiveQuery({ query: (q) => canReadContacts ? q.from({ contacts: getContactsCollection() }) : undefined });
  const { data: deals = [], isLoading: loadingDeals } = useLiveQuery({ query: (q) => canReadDeals ? q.from({ deals: getDealsCollection() }) : undefined });
  const { data: activities = [], isLoading: loadingActivities } = useLiveQuery({ query: (q) => canReadActivities ? q.from({ activities: getActivitiesCollection() }) : undefined });
  const { data: conversations = [], isLoading: loadingConversations } = useLiveQuery({ query: (q) => canReadInbox && view === "inbox" ? q.from({ conversations: getConversationsCollection() }) : undefined }, [canReadInbox, view]);
  const [period, setPeriod] = useState<Period>("7");
  const periodDays = Number(period);
  const snapshot = useMemo(() => buildCrmDashboard({
    contacts,
    deals: deals.map((deal) => ({ ...deal, amount: syncedAmount(deal.amount) })),
    activities,
    now: new Date(),
    periodDays,
  }), [activities, contacts, deals, periodDays]);
  const inboxSnapshot = useMemo(() => buildInboxDashboard({ conversations, now: new Date(), periodDays }), [conversations, periodDays]);
  const loading = loadingContacts || loadingDeals || loadingActivities;
  const hasRecords = contacts.length > 0 || deals.length > 0 || activities.length > 0;
  const visibleRecords = view === "people" ? contacts.length > 0 : view === "deals" ? deals.length > 0 : view === "activities" ? activities.length > 0 : view === "inbox" ? conversations.length > 0 : hasRecords;
  const hasMetrics = canReadContacts || canReadDeals || canReadActivities || canReadInbox;
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

  const count = (value: number) => numberFormat.format(value);
  return <PageFrame className={styles.page}>
    <PageHeader title={viewTitle} actions={hasMetrics && !firstRun ? <SegmentedControl label="Período do relatório" value={period} options={PERIODS} onValueChange={setPeriod} /> : undefined} />
    {firstRun && <EmptyState variant="featured" icon="chart" title="Os relatórios começam com seus registros" description="Cadastre pessoas, acompanhe negócios e agende atividades. O desempenho da equipe aparece aqui automaticamente." action={canImportContacts ? <Button onClick={() => void navigate("/contacts/import")}>Importar pessoas</Button> : undefined} />}
    {!hasMetrics && <PageState kind="forbidden" title="Indicadores indisponíveis" description="Seu grupo de acesso ainda não permite consultar pessoas, negócios ou atividades. Peça acesso a quem administra a organização." />}
    {firstRun && <ActionCardGroup title="Acompanhe o trabalho da equipe">
      {canReadContacts && <ActionCard icon="team" title="Pessoas" description="Veja quem entrou na base e como o relacionamento evolui." action={<Button variant="secondary" onClick={() => void navigate("/")}>Abrir Leads</Button>} />}
      {canReadDeals && <ActionCard icon="briefcase" title="Oportunidades" description="Acompanhe o valor e o andamento dos negócios no funil." action={<Button variant="secondary" onClick={() => void navigate("/deals")}>Abrir CRM</Button>} />}
      {canReadActivities && <ActionCard icon="calendar" title="Compromissos" description="Veja tarefas, reuniões e ligações da equipe em uma agenda." action={<Button variant="secondary" onClick={() => void navigate("/activities")}>Abrir atividades</Button>} />}
      {canReadInbox && <ActionCard icon="message" title="Atendimento" description="Acompanhe tempo de resposta e de resolução das conversas." action={<Button variant="secondary" onClick={() => void navigate("/inbox")}>Abrir atendimento</Button>} />}
    </ActionCardGroup>}
    {hasMetrics && !firstRun && <>
      <SectionTitle level="section" description="Indicadores do período selecionado">{view === "overview" ? "Desempenho" : `Desempenho de ${viewTitle.toLocaleLowerCase("pt-BR")}`}</SectionTitle>
      <DashboardGrid metrics>
      {canReadContacts && showPeople && <KpiCard render={<Link to="/" />} label="Pessoas na base" value={count(snapshot.totalContacts)} {...changeDelta(snapshot.newContactsChange)} hint={`${count(snapshot.newContacts)} ${snapshot.newContacts === 1 ? "nova" : "novas"} em ${periodDays} dias`} trend={snapshot.days.map((day) => day.newContacts)} state={loadingContacts ? "loading" : "ready"} />}
      {canReadContacts && view === "people" && <KpiCard render={<Link to="/?status=new" />} label="Novas pessoas no período" value={count(snapshot.newContacts)} hint={`${periodDays} dias selecionados`} trend={snapshot.days.map((day) => day.newContacts)} state={loadingContacts ? "loading" : "ready"} />}
      {canReadDeals && showDeals && <KpiCard render={<Link to="/deals" />} label="Negócios em aberto" value={count(snapshot.openDeals)} hint={formatBRL(snapshot.openPipelineAmount)} trend={snapshot.days.map((day) => day.newDeals)} state={loadingDeals ? "loading" : "ready"} />}
      {canReadDeals && view === "deals" && <KpiCard render={<Link to="/deals" />} label="Valor em negociação" value={formatBRL(snapshot.openPipelineAmount)} hint="Negócios em aberto" state={loadingDeals ? "loading" : "ready"} />}
      {canReadActivities && showActivities && <KpiCard render={<Link to="/activities" />} label="Atividades atrasadas" value={count(snapshot.overdueActivities)} hint="Pendências anteriores a hoje" {...(snapshot.overdueActivities > 0 ? { delta: { label: "Revisar", tone: "negative" } as KpiDelta } : {})} state={loadingActivities ? "loading" : "ready"} />}
      {canReadActivities && showActivities && <KpiCard render={<Link to="/activities" />} label="Conclusão no período" value={snapshot.activityCompletionRate === null ? "—" : `${snapshot.activityCompletionRate}%`} hint={`${periodDays} dias selecionados`} trend={snapshot.days.map((day) => day.activities)} state={loadingActivities ? "loading" : "ready"} />}
      {canReadInbox && view === "inbox" && <KpiCard render={<Link to="/inbox" />} label="Conversas em aberto" value={count(inboxSnapshot.openConversations)} hint={`${count(inboxSnapshot.unassignedConversations)} não atribuídas`} {...(inboxSnapshot.unassignedConversations > 0 ? { delta: { label: "Sem responsável", tone: "negative" } as KpiDelta } : {})} state={loadingConversations ? "loading" : "ready"} />}
      {canReadInbox && view === "inbox" && <KpiCard render={<Link to="/inbox" />} label="Primeira resposta, em média" value={inboxSnapshot.averageFirstResponseMinutes === null ? "—" : formatMinutes(inboxSnapshot.averageFirstResponseMinutes)} hint="Todas as conversas respondidas" state={loadingConversations ? "loading" : "ready"} />}
      {canReadInbox && view === "inbox" && <KpiCard render={<Link to="/inbox?box=closed" />} label="Resolução, em média" value={inboxSnapshot.averageResolutionMinutes === null ? "—" : formatMinutes(inboxSnapshot.averageResolutionMinutes)} hint={`${count(inboxSnapshot.resolvedInPeriod)} resolvidas no período`} state={loadingConversations ? "loading" : "ready"} />}
      </DashboardGrid>
    </>}
    {hasMetrics && !firstRun && <>
      <SectionTitle level="section" description="Novos registros e atividades por dia">Movimento no período</SectionTitle>
      <DashboardGrid>
        <div className={styles.wideChart}><DataChart title="Evolução diária" description={view === "overview" ? "Pessoas, negócios e atividades" : viewTitle} data={chartData} series={chartSeries} kind="area" state={loading ? "loading" : visibleRecords ? "ready" : "empty"} /></div>
      </DashboardGrid>
      {view !== "activities" && <><SectionTitle level="section" description="Como os registros estão organizados agora">Distribuição</SectionTitle>
      <DashboardGrid>
        {canReadDeals && showDeals && <DonutChart title="Negócios por situação" state={loadingDeals ? "loading" : deals.length ? "ready" : "empty"} formatValue={count} data={[
        { id: "open", label: "Em aberto", value: snapshot.dealsByStatus.open, color: 1 },
        { id: "won", label: "Ganhos", value: snapshot.dealsByStatus.won, color: 2 },
        { id: "lost", label: "Perdidos", value: snapshot.dealsByStatus.lost, color: 6 },
        ]} />}
        {canReadContacts && showPeople && <DonutChart title="Pessoas por etapa" state={loadingContacts ? "loading" : contacts.length ? "ready" : "empty"} formatValue={count} data={[
        { id: "new", label: "Novos", value: snapshot.contactsByStatus.new, color: 1 },
        { id: "qualified", label: "Qualificados", value: snapshot.contactsByStatus.qualified, color: 2 },
        { id: "nurturing", label: "Em nutrição", value: snapshot.contactsByStatus.nurturing, color: 3 },
        { id: "customer", label: "Clientes", value: snapshot.contactsByStatus.customer, color: 4 },
        { id: "unqualified", label: "Desqualificados", value: snapshot.contactsByStatus.unqualified, color: 6 },
        ]} />}
      </DashboardGrid></>}
    </>}
  </PageFrame>;
}

const numberFormat = new Intl.NumberFormat("pt-BR");

/** Variação contra o período anterior: a cor segue o que é bom (mais gente chegando). */
function changeDelta(change: number | null): { delta?: KpiDelta } {
  if (change === null) return {};
  if (change === 0) return { delta: { label: "0%", tone: "neutral" } };
  return { delta: { label: `${change > 0 ? "+" : "−"}${Math.abs(change)}%`, tone: change > 0 ? "positive" : "negative", direction: change > 0 ? "up" : "down" } };
}

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `${hours} h` : `${Math.floor(hours / 24)} d`;
}

function formatDay(value: string, periodDays: number): string {
  return new Intl.DateTimeFormat("pt-BR", periodDays > 7 ? { day: "2-digit", month: "2-digit" } : { weekday: "short" }).format(new Date(`${value}T12:00:00`));
}
