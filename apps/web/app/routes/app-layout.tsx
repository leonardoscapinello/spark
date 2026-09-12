import { Link, Outlet, redirect, useLocation, useNavigation } from "react-router";
import type { Capability } from "@spark/core";
import { Icon, NavigationRail, Sidebar, SidebarItem, SidebarSection, Tooltip, type IconName } from "@spark/ui-web";
import type { Route } from "./+types/app-layout";
import { restoreSession } from "../lib/auth.client";
import { ADMIN_CAPABILITIES } from "../lib/route-access.client";
import styles from "./app-layout.module.css";

type NavItem = { label: string; to: string; icon: IconName; capability?: Capability };
type NavModule = { id: string; title: string; icon: IconName; to: string; sections: { title: string; items: NavItem[] }[] };

const modules: NavModule[] = [
  { id: "overview", title: "Relatórios", icon: "chart", to: "/dashboard", sections: [
    { title: "Desempenho", items: [{ label: "Visão geral", to: "/dashboard", icon: "grid" }] },
  ] },
  { id: "leads", title: "Leads", icon: "user", to: "/", sections: [
    { title: "Pessoas", items: [
      { label: "Todos os contatos", to: "/", icon: "team", capability: "contacts:read" },
      { label: "Novos leads", to: "/?status=new", icon: "user", capability: "contacts:read" },
      { label: "Qualificados", to: "/?status=qualified", icon: "check", capability: "contacts:read" },
      { label: "Clientes", to: "/?status=customer", icon: "star", capability: "contacts:read" },
    ] },
    { title: "Organizações", items: [
      { label: "Empresas", to: "/companies", icon: "building", capability: "companies:read" },
    ] },
    { title: "Dados", items: [
      { label: "Importar contatos", to: "/contacts/import", icon: "upload", capability: "contacts:write" },
    ] },
  ] },
  { id: "crm", title: "CRM", icon: "briefcase", to: "/deals", sections: [
    { title: "Negócios", items: [
      { label: "Funil em aberto", to: "/deals", icon: "briefcase", capability: "deals:read" },
      { label: "Ganhos", to: "/deals?status=won", icon: "check", capability: "deals:read" },
      { label: "Perdidos", to: "/deals?status=lost", icon: "close", capability: "deals:read" },
    ] },
    { title: "Agenda", items: [
      { label: "Atividades", to: "/activities", icon: "calendar", capability: "activities:read" },
    ] },
    { title: "Oferta", items: [
      { label: "Produtos", to: "/catalog?view=products", icon: "file", capability: "catalog:read" },
      { label: "Ofertas e descontos", to: "/catalog?view=discounts", icon: "bolt", capability: "catalog:read" },
    ] },
  ] },
  { id: "inbox", title: "Atendimento", icon: "inbox", to: "/inbox", sections: [
    { title: "Caixas", items: [
      { label: "Abertas", to: "/inbox", icon: "inbox", capability: "inbox:read" },
      { label: "Minhas conversas", to: "/inbox?box=mine", icon: "user", capability: "inbox:read" },
      { label: "Não atribuídas", to: "/inbox?box=unassigned", icon: "team", capability: "inbox:read" },
      { label: "Adiadas", to: "/inbox?box=snoozed", icon: "calendar", capability: "inbox:read" },
      { label: "Fechadas", to: "/inbox?box=closed", icon: "check", capability: "inbox:read" },
      { label: "Todas", to: "/inbox?box=all", icon: "grid", capability: "inbox:read" },
    ] },
    { title: "Ferramentas", items: [
      { label: "Respostas prontas", to: "/inbox/replies", icon: "file", capability: "inbox:read" },
    ] },
  ] },
  { id: "automations", title: "Automações", icon: "bolt", to: "/automations", sections: [
    { title: "Fluxos", items: [
      { label: "Todos os fluxos", to: "/automations", icon: "grid", capability: "automations:read" },
      { label: "Ativos", to: "/automations?filter=active", icon: "bolt", capability: "automations:read" },
      { label: "Rascunhos", to: "/automations?filter=draft", icon: "file", capability: "automations:read" },
      { label: "Pausados", to: "/automations?filter=paused", icon: "calendar", capability: "automations:read" },
    ] },
  ] },
  { id: "content", title: "Marketing", icon: "mail", to: "/campaigns", sections: [
    { title: "E-mail", items: [
      { label: "Campanhas", to: "/campaigns", icon: "mail", capability: "campaigns:read" },
      { label: "Públicos", to: "/campaigns?view=audiences", icon: "team", capability: "campaigns:read" },
    ] },
    { title: "Captação", items: [
      { label: "Páginas", to: "/pages", icon: "file", capability: "pages:read" },
      { label: "Formulários", to: "/forms", icon: "file", capability: "forms:read" },
    ] },
    { title: "Biblioteca", items: [
      { label: "Arquivos", to: "/files", icon: "file", capability: "files:read" },
    ] },
  ] },
  { id: "social", title: "Redes sociais", icon: "message", to: "/social", sections: [
    { title: "Publicação", items: [
      { label: "Publicações", to: "/social", icon: "calendar", capability: "social:read" },
      { label: "Canais conectados", to: "/social?view=channels", icon: "team", capability: "social:read" },
    ] },
  ] },
  { id: "admin", title: "Administração", icon: "settings", to: "/admin", sections: [
    { title: "Início", items: [{ label: "Início", to: "/admin", icon: "grid" }] },
    { title: "Acesso", items: [
      { label: "Usuários", to: "/admin/users", icon: "user", capability: "users:manage" },
      { label: "Times", to: "/admin/teams", icon: "team", capability: "users:manage" },
      { label: "Grupos de permissões", to: "/admin/permission-groups", icon: "settings", capability: "permission_groups:manage" },
    ] },
    { title: "Sistema", items: [
      { label: "Integrações", to: "/integrations", icon: "bolt", capability: "integrations:read" },
      { label: "Auditoria", to: "/admin/audit-log", icon: "file", capability: "audit_logs:read" },
      { label: "Campos personalizados", to: "/settings", icon: "file", capability: "settings:manage" },
    ] },
  ] },
];

const accountModule: NavModule = { id: "account", title: "Minha conta", icon: "account", to: "/security", sections: [
  { title: "Conta", items: [{ label: "Segurança", to: "/security", icon: "settings" }] },
] };

function pathMatches(pathname: string, to: string, search = "") {
  const [route, query] = to.split("?");
  const routeMatches = route === "/"
    ? pathname === "/" || pathname.startsWith("/contacts/") && pathname !== "/contacts/import"
    : route === "/inbox" || route === "/admin" ? pathname === route : pathname === route || pathname.startsWith(`${route}/`);
  if (!query) {
    const relevantParameter = ({ "/": "status", "/deals": "status", "/catalog": "view", "/inbox": "box", "/automations": "filter", "/campaigns": "view", "/social": "view" } as Record<string, string>)[route ?? ""];
    return routeMatches && (!relevantParameter || !new URLSearchParams(search).has(relevantParameter));
  }
  const expected = new URLSearchParams(query);
  const actual = new URLSearchParams(search);
  return routeMatches && [...expected.entries()].every(([key, value]) => actual.get(key) === value);
}

function moduleForPath(pathname: string): NavModule {
  if (pathname === "/security") return accountModule;
  if (pathname === "/admin" || pathname.startsWith("/admin/") || pathname === "/integrations" || pathname === "/settings") return modules[7]!;
  if (pathname.startsWith("/contacts/") || pathname === "/" || pathname.startsWith("/companies")) return modules[1]!;
  if (["/deals", "/activities", "/catalog"].some((route) => pathMatches(pathname, route))) return modules[2]!;
  if (pathname.startsWith("/inbox")) return modules[3]!;
  if (pathname.startsWith("/automations")) return modules[4]!;
  if (["/campaigns", "/pages", "/forms", "/files"].some((route) => pathMatches(pathname, route))) return modules[5]!;
  if (pathname.startsWith("/social")) return modules[6]!;
  return modules[0]!;
}

const TOP_NAVIGATION: Partial<Record<string, readonly string[]>> = {
  leads: ["Todos os contatos", "Empresas"],
  crm: ["Funil em aberto", "Atividades", "Produtos", "Ofertas e descontos"],
  automations: ["Todos os fluxos", "Ativos", "Rascunhos", "Pausados"],
  social: ["Publicações", "Canais conectados"],
};

function usesTopNavigation(moduleId: string, pathname: string) {
  if (moduleId === "leads") return pathname === "/" || pathname === "/companies";
  if (moduleId === "crm") return pathname === "/deals" || pathname === "/activities" || pathname === "/catalog";
  if (moduleId === "automations") return pathname === "/automations";
  if (moduleId === "social") return pathname === "/social";
  return false;
}

/** Session restoration happens on the client because it reads local storage. */
export async function clientLoader() {
  const session = await restoreSession();
  if (!session) throw redirect("/login");
  return session;
}

export function HydrateFallback() {
  return <div className={styles.shell} data-sidebar="hidden" aria-busy="true">
    <NavigationRail className={styles.rail}>
      <div className={styles.railBrand}><img src="/brand/leonardo-scapinello-symbol-ink.svg" alt="Leonardo Scapinello" /></div>
      <div className={styles.railModules} aria-hidden="true">{modules.filter((module) => module.id !== "admin").map((module) => <div key={module.id} className={styles.railPlaceholder} />)}</div>
    </NavigationRail>
    <main className={styles.conteudo}>
      <div className={styles.loadingContent} role="status">Preparando a área de trabalho…</div>
    </main>
  </div>;
}

export default function AppLayout({ loaderData: session }: Route.ComponentProps) {
  const location = useLocation();
  const navigation = useNavigation();
  const pendingLocation = navigation.state === "loading" ? navigation.location : null;
  const allowed = (capability?: Capability) => !capability || session.capabilities.includes(capability);
  const visibleModules = modules.filter((module) => module.id === "admin"
    ? ADMIN_CAPABILITIES.some(allowed)
    : module.sections.some((section) => section.items.some((item) => allowed(item.capability))));
  const current = moduleForPath(location.pathname);
  const topNavigation = usesTopNavigation(current.id, location.pathname)
    ? current.sections.flatMap((section) => section.items).filter((item) => allowed(item.capability) && TOP_NAVIGATION[current.id]?.includes(item.label))
    : [];
  const showSidebar = (current.id === "content" || current.id === "admin" && location.pathname !== "/admin" || current.id === "inbox" && location.pathname !== "/inbox")
    && !["/automations/", "/pages/", "/forms/"].some((prefix) => location.pathname.startsWith(prefix));

  function railLink(module: NavModule) {
    const active = current.id === module.id;
    const pending = pendingLocation && moduleForPath(pendingLocation.pathname).id === module.id;
    const first = module.sections.flatMap((section) => section.items).find((item) => allowed(item.capability));
    return <Tooltip key={module.id} content={module.title} pinOnClick={false}><Link to={first?.to ?? module.to} prefetch="intent" className={[styles.railLink, module.id === "account" && styles.accountLink].filter(Boolean).join(" ")} aria-label={module.title} aria-current={active && !pendingLocation ? "page" : undefined} data-pending={pending || undefined}><Icon name={module.icon} /><span className={styles.railLabel}>{module.title}</span></Link></Tooltip>;
  }

  return (
    <div className={styles.shell} data-sidebar={showSidebar ? "visible" : "hidden"} data-navigating={pendingLocation ? "true" : undefined}>
      <NavigationRail className={styles.rail}>
        <Link to="/dashboard" prefetch="intent" className={styles.railBrand} aria-label="Leonardo Scapinello — início"><img src="/brand/leonardo-scapinello-symbol-ink.svg" alt="" /></Link>
        <div className={styles.railModules}>{visibleModules.filter((module) => module.id !== "admin").map(railLink)}</div>
        <div className={styles.railBottom}>
          {visibleModules.filter((module) => module.id === "admin").map(railLink)}
          {railLink(accountModule)}
        </div>
      </NavigationRail>
      {showSidebar && <Sidebar title={current.title} className={styles.sidebar}>
        {current.sections.map((section) => {
          const items = section.items.filter((item) => allowed(item.capability));
          if (items.length === 0) return null;
          const links = items.map((item) => <SidebarItem key={item.to} render={<Link to={item.to} prefetch="intent" data-pending={pendingLocation && pathMatches(pendingLocation.pathname, item.to, pendingLocation.search) || undefined} />} active={pathMatches(location.pathname, item.to, location.search)} icon={<Icon name={item.icon} />}>{item.label}</SidebarItem>);
          return current.sections.length === 1
            ? <div key={section.title} className={styles.singleSection}>{links}</div>
            : <SidebarSection key={section.title} title={section.title}>{links}</SidebarSection>;
        })}
      </Sidebar>}
      <main className={styles.conteudo} data-surface={location.pathname === "/inbox" ? "workspace" : "panel"} aria-busy={Boolean(pendingLocation)}>
        {topNavigation.length > 0 && <nav className={styles.moduleTabs} aria-label={`Áreas de ${current.title}`}>
          {topNavigation.map((item) =>
            <Link key={item.to} to={item.to} prefetch="intent" className={styles.moduleTab} aria-current={!pendingLocation && pathMatches(location.pathname, item.to, location.search) ? "page" : undefined} data-pending={pendingLocation && pathMatches(pendingLocation.pathname, item.to, pendingLocation.search) || undefined}>{item.label}</Link>
          )}
        </nav>}
        <Outlet />
      </main>
    </div>
  );
}
