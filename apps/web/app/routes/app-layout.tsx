import { Link, Outlet, redirect, useLocation, useNavigate } from "react-router";
import type { Capability } from "@spark/core";
import { Button, Icon, NavigationRail, Sidebar, SidebarItem, SidebarSection, Tooltip, type IconName } from "@spark/ui-web";
import type { Route } from "./+types/app-layout";
import { restoreSession, signOut } from "../lib/auth.client";
import styles from "./app-layout.module.css";

type NavItem = { label: string; to: string; icon: IconName; capability?: Capability };
type NavModule = { id: string; title: string; icon: IconName; to: string; sections: { title: string; items: NavItem[] }[] };

const modules: NavModule[] = [
  { id: "overview", title: "Início", icon: "grid", to: "/dashboard", sections: [
    { title: "Visão geral", items: [{ label: "Painel", to: "/dashboard", icon: "chart" }] },
  ] },
  { id: "leads", title: "Leads", icon: "user", to: "/", sections: [
    { title: "Pessoas", items: [
      { label: "Contatos", to: "/", icon: "team", capability: "contacts:read" },
      { label: "Importar contatos", to: "/contacts/import", icon: "upload", capability: "contacts:write" },
    ] },
  ] },
  { id: "crm", title: "CRM", icon: "briefcase", to: "/deals", sections: [
    { title: "Vendas", items: [
      { label: "Negócios", to: "/deals", icon: "briefcase", capability: "deals:read" },
      { label: "Empresas", to: "/companies", icon: "building", capability: "companies:read" },
      { label: "Atividades", to: "/activities", icon: "calendar", capability: "activities:read" },
    ] },
    { title: "Recursos", items: [{ label: "Catálogo", to: "/catalog", icon: "file", capability: "catalog:read" }] },
  ] },
  { id: "inbox", title: "Conversas", icon: "inbox", to: "/inbox", sections: [
    { title: "Atendimento", items: [
      { label: "Conversas", to: "/inbox", icon: "message", capability: "inbox:read" },
      { label: "Respostas prontas", to: "/inbox/replies", icon: "file", capability: "inbox:read" },
    ] },
  ] },
  { id: "automations", title: "Automações", icon: "bolt", to: "/automations", sections: [
    { title: "Fluxos", items: [{ label: "Automações", to: "/automations", icon: "bolt", capability: "automations:read" }] },
  ] },
  { id: "content", title: "Marketing", icon: "mail", to: "/campaigns", sections: [
    { title: "Campanhas e canais", items: [
      { label: "Campanhas", to: "/campaigns", icon: "mail", capability: "campaigns:read" },
      { label: "Páginas", to: "/pages", icon: "file", capability: "pages:read" },
      { label: "Formulários", to: "/forms", icon: "file", capability: "forms:read" },
      { label: "Redes sociais", to: "/social", icon: "chart", capability: "social:read" },
      { label: "Arquivos", to: "/files", icon: "file", capability: "files:read" },
    ] },
  ] },
  { id: "admin", title: "Administração", icon: "settings", to: "/admin/users", sections: [
    { title: "Acesso", items: [
      { label: "Usuários", to: "/admin/users", icon: "user", capability: "users:manage" },
      { label: "Times", to: "/admin/teams", icon: "team", capability: "users:manage" },
      { label: "Grupos de permissões", to: "/admin/permission-groups", icon: "settings", capability: "permission_groups:manage" },
    ] },
    { title: "Sistema", items: [
      { label: "Integrações", to: "/integrations", icon: "bolt", capability: "integrations:read" },
      { label: "Auditoria", to: "/admin/audit-log", icon: "file", capability: "audit_logs:read" },
      { label: "Configurações", to: "/settings", icon: "settings", capability: "settings:manage" },
    ] },
  ] },
];

const adminCapabilities: Capability[] = ["users:manage", "permission_groups:manage", "settings:manage"];
const accountModule: NavModule = { id: "account", title: "Minha conta", icon: "user", to: "/security", sections: [
  { title: "Conta", items: [{ label: "Segurança", to: "/security", icon: "settings" }] },
] };

function pathMatches(pathname: string, to: string) {
  return to === "/" ? pathname === "/" || pathname.startsWith("/contacts/") && pathname !== "/contacts/import" : pathname === to || pathname.startsWith(`${to}/`);
}

function moduleForPath(pathname: string): NavModule {
  if (pathname === "/security") return accountModule;
  if (pathname.startsWith("/admin/") || pathname === "/integrations" || pathname === "/settings") return modules[6]!;
  if (pathname.startsWith("/contacts/") || pathname === "/") return modules[1]!;
  if (["/deals", "/companies", "/activities", "/catalog"].some((route) => pathMatches(pathname, route))) return modules[2]!;
  if (pathname.startsWith("/inbox")) return modules[3]!;
  if (pathname.startsWith("/automations")) return modules[4]!;
  if (["/campaigns", "/pages", "/forms", "/social", "/files"].some((route) => pathMatches(pathname, route))) return modules[5]!;
  return modules[0]!;
}

/** Session restoration happens on the client because it reads local storage. */
export async function clientLoader() {
  const session = await restoreSession();
  if (!session) throw redirect("/login");
  return session;
}

export function HydrateFallback() {
  return <div className={styles.carregando}>Carregando…</div>;
}

export default function AppLayout({ loaderData: session }: Route.ComponentProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const allowed = (capability?: Capability) => !capability || session.capabilities.includes(capability);
  const visibleModules = modules.filter((module) => module.id === "admin"
    ? adminCapabilities.some(allowed)
    : module.sections.some((section) => section.items.some((item) => allowed(item.capability))));
  const current = moduleForPath(location.pathname);

  async function handleSignOut() {
    await signOut();
    navigate("/login");
  }

  function railLink(module: NavModule) {
    const active = current.id === module.id;
    const first = module.sections.flatMap((section) => section.items).find((item) => allowed(item.capability));
    return <Tooltip key={module.id} content={module.title}><Link to={first?.to ?? module.to} className={styles.railLink} aria-label={module.title} aria-current={active ? "page" : undefined}><Icon name={module.icon} /></Link></Tooltip>;
  }

  return (
    <div className={styles.shell}>
      <NavigationRail className={styles.rail}>
        <Link to="/dashboard" className={styles.railBrand} aria-label="Leonardo Scapinello — início"><img src="/brand/leonardo-scapinello-symbol-ink.svg" alt="" /></Link>
        <div className={styles.railModules}>{visibleModules.filter((module) => module.id !== "admin").map(railLink)}</div>
        <div className={styles.railBottom}>
          {visibleModules.filter((module) => module.id === "admin").map(railLink)}
          {railLink(accountModule)}
        </div>
      </NavigationRail>
      <Sidebar title={current.title} className={styles.sidebar} footer={current.id === "account" ? <Button variant="ghost" size="sm" onClick={handleSignOut} className={styles.sair}><Icon name="exit" /> Sair da conta</Button> : null}>
        {current.sections.map((section) => {
          const items = section.items.filter((item) => allowed(item.capability));
          if (items.length === 0) return null;
          const links = items.map((item) => <SidebarItem key={item.to} render={<Link to={item.to} />} active={pathMatches(location.pathname, item.to)} icon={<Icon name={item.icon} />}>{item.label}</SidebarItem>);
          return current.sections.length === 1
            ? <div key={section.title} className={styles.singleSection}>{links}</div>
            : <SidebarSection key={section.title} title={section.title}>{links}</SidebarSection>;
        })}
      </Sidebar>
      <main className={styles.conteudo}><Outlet /></main>
    </div>
  );
}
