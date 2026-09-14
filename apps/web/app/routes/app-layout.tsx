import { type MouseEvent, type PointerEvent, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, Outlet, redirect, useLocation, useNavigate, useNavigation } from "react-router";
import { useLiveQuery } from "@tanstack/react-db";
import type { Capability } from "@spark/core";
import { Avatar, Button, Icon, MenuButton, MenuGroup, MenuIdentity, MenuItem, MenuSeparator, NavigationRail, QuickNavigation, Sidebar, SidebarItem, SidebarSection, type IconName, type QuickNavigationItem } from "@spark/ui-web";
import type { Route } from "./+types/app-layout";
import { refreshSessionProfile, restoreSession, signOut } from "../lib/auth.client";
import { getContactsCollection } from "../lib/contacts-collection.client";
import { ADMIN_CAPABILITIES } from "../lib/route-access.client";
import styles from "./app-layout.module.css";

type NavItem = { label: string; to: string; icon: IconName; capability?: Capability };
type NavModule = { id: string; title: string; icon: IconName; to: string; sections: { title: string; icon?: IconName; items: NavItem[] }[] };

const modules: NavModule[] = [
  { id: "overview", title: "Relatórios", icon: "chart", to: "/dashboard", sections: [
    { title: "Desempenho", items: [{ label: "Visão geral", to: "/dashboard", icon: "grid" }] },
    { title: "Áreas", items: [
      { label: "Pessoas", to: "/dashboard?view=people", icon: "user", capability: "contacts:read" },
      { label: "Negócios", to: "/dashboard?view=deals", icon: "briefcase", capability: "deals:read" },
      { label: "Atividades", to: "/dashboard?view=activities", icon: "calendar", capability: "activities:read" },
    ] },
  ] },
  { id: "leads", title: "Leads", icon: "user", to: "/", sections: [
    { title: "Pessoas", icon: "team", items: [
      { label: "Todas as pessoas", to: "/", icon: "team", capability: "contacts:read" },
      { label: "Novos leads", to: "/?status=new", icon: "user", capability: "contacts:read" },
      { label: "Qualificados", to: "/?status=qualified", icon: "check", capability: "contacts:read" },
      { label: "Clientes", to: "/?status=customer", icon: "star", capability: "contacts:read" },
    ] },
    { title: "Organizações", icon: "building", items: [
      { label: "Empresas", to: "/companies", icon: "building", capability: "companies:read" },
    ] },
    { title: "Dados", icon: "upload", items: [
      { label: "Importar pessoas", to: "/contacts/import", icon: "upload", capability: "contacts:write" },
    ] },
  ] },
  { id: "crm", title: "CRM", icon: "briefcase", to: "/deals", sections: [
    { title: "Negócios", items: [
      { label: "Negócios", to: "/deals", icon: "briefcase", capability: "deals:read" },
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
      { label: "Páginas", to: "/pages", icon: "page", capability: "pages:read" },
      { label: "Formulários", to: "/forms", icon: "form", capability: "forms:read" },
    ] },
    { title: "Biblioteca", items: [
      { label: "Arquivos", to: "/files", icon: "folder", capability: "files:read" },
    ] },
  ] },
  { id: "social", title: "Redes sociais", icon: "message", to: "/social", sections: [
    { title: "Publicação", items: [
      { label: "Publicações", to: "/social", icon: "calendar", capability: "social:read" },
      { label: "Canais conectados", to: "/social?view=channels", icon: "team", capability: "social:read" },
    ] },
  ] },
  { id: "admin", title: "Configurações", icon: "settings", to: "/admin", sections: [
    { title: "Início", items: [{ label: "Início", to: "/admin", icon: "grid" }] },
    { title: "Área de trabalho", items: [
      { label: "Usuários", to: "/admin/users", icon: "user", capability: "users:manage" },
      { label: "Times", to: "/admin/teams", icon: "team", capability: "users:manage" },
      { label: "Grupos de permissões", to: "/admin/permission-groups", icon: "settings", capability: "permission_groups:manage" },
    ] },
    { title: "Canais", items: [
      { label: "Integrações", to: "/integrations", icon: "bolt", capability: "integrations:read" },
    ] },
    { title: "Dados", items: [
      { label: "Auditoria", to: "/admin/audit-log", icon: "file", capability: "audit_logs:read" },
      { label: "Campos personalizados", to: "/settings", icon: "file", capability: "settings:manage" },
    ] },
  ] },
];

const accountModule: NavModule = { id: "account", title: "Perfil", icon: "account", to: "/security", sections: [
  { title: "Conta", items: [{ label: "Segurança", to: "/security", icon: "settings" }] },
] };

const RAIL_PINNED_KEY = "spark_rail_pinned";

// Fixar o trilho é preferência de quem usa a máquina, não da organização —
// mora no navegador, não sincroniza (diferente das colunas escondidas de
// contacts.tsx, que também são por navegador pelo mesmo motivo: escolha de
// tela, não regra de negócio).
function readRailPinned(): boolean {
  try { return localStorage.getItem(RAIL_PINNED_KEY) === "true"; } catch { return false; }
}

function pathMatches(pathname: string, to: string, search = "") {
  const [route, query] = to.split("?");
  const routeMatches = route === "/"
    ? pathname === "/" || pathname.startsWith("/contacts/") && pathname !== "/contacts/import"
    : route === "/inbox" || route === "/admin" ? pathname === route : pathname === route || pathname.startsWith(`${route}/`);
  if (!query) {
    const relevantParameter = ({ "/": "status", "/dashboard": "view", "/deals": "status", "/catalog": "view", "/inbox": "box", "/automations": "filter", "/campaigns": "view", "/social": "view" } as Record<string, string>)[route ?? ""];
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
  crm: ["Negócios", "Atividades", "Produtos", "Ofertas e descontos"],
  content: ["Campanhas", "Públicos", "Páginas", "Formulários", "Arquivos"],
  social: ["Publicações", "Canais conectados"],
};

function usesTopNavigation(moduleId: string, pathname: string) {
  if (moduleId === "crm") return pathname === "/deals" || pathname === "/activities" || pathname === "/catalog";
  if (moduleId === "content") return ["/campaigns", "/pages", "/forms", "/files"].includes(pathname);
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
    <NavigationRail className={styles.rail} data-collapsed>
      <div className={styles.railBrand}><img className={styles.brandSymbol} src="/brand/leonardo-scapinello-symbol-ink.svg" alt="Leonardo Scapinello" /></div>
      <div className={styles.railModules} aria-hidden="true">{modules.filter((module) => module.id !== "admin").map((module) => <div key={module.id} className={styles.railPlaceholder} />)}</div>
    </NavigationRail>
    <main className={styles.conteudo}>
      <div className={styles.loadingContent} role="status">Preparando a área de trabalho…</div>
    </main>
  </div>;
}

export default function AppLayout({ loaderData: session }: Route.ComponentProps) {
  const location = useLocation();
  const current = moduleForPath(location.pathname);
  const { data: navigationContacts = [] } = useLiveQuery({ query: (q) => current.id === "leads" && session.capabilities.includes("contacts:read") ? q.from({ contacts: getContactsCollection() }) : undefined });
  const leadCounts = useMemo(() => {
    const active = navigationContacts.filter((contact) => !contact.deletedAt);
    return new Map([
      ["/", active.length],
      ["/?status=new", active.filter((contact) => contact.leadStatus === "new").length],
      ["/?status=qualified", active.filter((contact) => contact.leadStatus === "qualified").length],
      ["/?status=customer", active.filter((contact) => contact.leadStatus === "customer").length],
    ]);
  }, [navigationContacts]);
  const navigate = useNavigate();
  const navigation = useNavigation();
  const activeRailLink = useRef<HTMLAnchorElement>(null);
  const railModulesRef = useRef<HTMLDivElement>(null);
  const moduleTabsRef = useRef<HTMLElement>(null);
  const activeTopTab = useRef<HTMLAnchorElement>(null);
  const activeSidebarLink = useRef<HTMLAnchorElement>(null);
  const pointerNavigation = useRef<string | null>(null);
  const [navigationIntent, setNavigationIntent] = useState<{ to: string; fromKey: string } | null>(null);
  const [accountProfile, setAccountProfile] = useState(session);
  const [quickNavigationOpen, setQuickNavigationOpen] = useState(false);
  const [railPinned, setRailPinned] = useState(readRailPinned);
  const [railHovered, setRailHovered] = useState(false);
  const railExpanded = railPinned || railHovered;

  function toggleRailPinned() {
    setRailPinned((current) => {
      const next = !current;
      try { localStorage.setItem(RAIL_PINNED_KEY, String(next)); } catch { /* modo privado: a escolha vale só nesta sessão */ }
      return next;
    });
  }
  const [tabIndicator, setTabIndicator] = useState<{ left: number; width: number } | null>(null);
  const pendingLocation = navigation.state === "loading" ? navigation.location : null;
  const requestedPath = pendingLocation?.pathname ?? (navigationIntent?.fromKey === location.key ? navigationIntent.to.split("?")[0] : null);
  const requestedSearch = pendingLocation?.search ?? (navigationIntent?.fromKey === location.key ? `?${navigationIntent.to.split("?")[1] ?? ""}` : "");
  const allowed = (capability?: Capability) => !capability || session.capabilities.includes(capability);
  const visibleModules = modules.filter((module) => module.id === "admin"
    ? ADMIN_CAPABILITIES.some(allowed)
    : module.sections.some((section) => section.items.some((item) => allowed(item.capability))));
  const quickNavigationItems: QuickNavigationItem[] = [
    ...visibleModules.flatMap((module) => module.sections.flatMap((section) => section.items.filter((item) => allowed(item.capability)).map((item) => ({ id: item.to, label: item.label, group: module.title, icon: item.icon })))),
    { id: "/security", label: "Segurança da conta", group: "Perfil", icon: "account" },
  ];
  const topNavigation = usesTopNavigation(current.id, location.pathname)
    ? current.sections.flatMap((section) => section.items).filter((item) => allowed(item.capability) && TOP_NAVIGATION[current.id]?.includes(item.label))
    : [];
  const topTabActive = (item: NavItem) =>
    (item.to === "/" && location.pathname === "/") ||
    (item.to === "/deals" && location.pathname === "/deals") ||
    pathMatches(location.pathname, item.to, location.search);
  const displayedTopTabActive = (item: NavItem) => requestedPath
    ? pathMatches(requestedPath, item.to, requestedSearch)
    : topTabActive(item);
  const showSidebar = current.id === "admin" || current.id === "leads" || current.id === "overview" || (current.id === "automations" && location.pathname === "/automations");
  const visibleSections = current.sections.map((section) => ({
    title: section.title,
    icon: section.icon,
    items: section.items.filter((item) => allowed(item.capability)),
  })).filter((section) => section.items.length > 0);
  const activeSecondaryItem = visibleSections.flatMap((section) => section.items)
    .find((item) => pathMatches(location.pathname, item.to, location.search)) ?? visibleSections[0]?.items[0];

  useEffect(() => {
    if (session.name) return;
    let active = true;
    void refreshSessionProfile().then((profile) => { if (active && profile) setAccountProfile(profile); });
    return () => { active = false; };
  }, [session.name]);

  useEffect(() => {
    function openQuickNavigation(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase() === "k") {
        event.preventDefault();
        setQuickNavigationOpen(true);
      }
    }
    window.addEventListener("keydown", openQuickNavigation);
    return () => window.removeEventListener("keydown", openQuickNavigation);
  }, []);

  function markNavigation(to: string) {
    if (`${location.pathname}${location.search}` !== to) setNavigationIntent({ to, fromKey: location.key });
  }

  function startLinkNavigation(event: PointerEvent<HTMLAnchorElement>, to: string) {
    if (event.pointerType !== "mouse" || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (`${location.pathname}${location.search}` === to) return;
    pointerNavigation.current = to;
    markNavigation(to);
    void navigate(to);
  }

  function finishLinkNavigation(event: MouseEvent<HTMLAnchorElement>, to: string) {
    if (pointerNavigation.current === to && event.detail > 0) {
      event.preventDefault();
      pointerNavigation.current = null;
      return;
    }
    if (!event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) markNavigation(to);
  }

  useEffect(() => {
    const active = activeRailLink.current;
    const modulesRail = railModulesRef.current;
    if (active && modulesRail && modulesRail.scrollHeight > modulesRail.clientHeight) active.scrollIntoView({ block: "nearest" });
  }, [current.id]);

  useEffect(() => {
    const active = activeTopTab.current;
    const tabs = active?.closest("nav");
    if (active && tabs && tabs.scrollWidth > tabs.clientWidth) active.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [location.pathname, location.search, requestedPath, requestedSearch]);

  useLayoutEffect(() => {
    const tabs = moduleTabsRef.current;
    const active = activeTopTab.current;
    if (!tabs || !active) { setTabIndicator(null); return; }
    const measure = () => setTabIndicator({ left: active.offsetLeft, width: active.offsetWidth });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(tabs);
    observer.observe(active);
    return () => observer.disconnect();
  }, [location.pathname, location.search, requestedPath, requestedSearch, current.id]);

  useEffect(() => {
    const active = activeSidebarLink.current;
    const strip = active?.parentElement?.parentElement;
    if (active && strip && strip.scrollWidth > strip.clientWidth) active.scrollIntoView({ block: "nearest", inline: "center" });
  }, [location.pathname, location.search]);

  async function leaveAccount() {
    await signOut().catch(() => undefined);
    void navigate("/login", { replace: true });
  }

  function railLink(module: NavModule) {
    const active = current.id === module.id;
    const pending = requestedPath && moduleForPath(requestedPath).id === module.id;
    const first = module.sections.flatMap((section) => section.items).find((item) => allowed(item.capability));
    const target = first?.to ?? module.to;
    return <Link key={module.id} ref={active ? activeRailLink : undefined} to={target} prefetch="intent" onPointerDown={(event) => startLinkNavigation(event, target)} onClick={(event) => finishLinkNavigation(event, target)} className={styles.railLink} aria-label={module.title} aria-current={active && !requestedPath ? "page" : undefined} data-pending={pending || undefined}><Icon name={module.icon} /><span className={styles.railLabel}>{module.title}</span></Link>;
  }

  return (
    <div className={styles.shell} data-sidebar={showSidebar ? "visible" : "hidden"} data-navigating={requestedPath ? "true" : undefined}>
      <NavigationRail className={styles.rail} data-expanded={railExpanded || undefined} data-pinned={railPinned || undefined} onPointerEnter={(event) => { if (event.pointerType === "mouse") setRailHovered(true); }} onPointerLeave={(event) => { if (event.pointerType === "mouse") setRailHovered(false); }} onFocusCapture={() => setRailHovered(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setRailHovered(false); }}>
        <Link to="/dashboard" prefetch="intent" className={styles.railBrand} aria-label="Leonardo Scapinello — início"><img className={styles.brandSymbol} src="/brand/leonardo-scapinello-symbol-ink.svg" alt="" /><img className={styles.brandWordmark} src="/brand/leonardo-scapinello-ink.svg" alt="" /></Link>
        <Button iconOnly size="sm" variant="ghost" shape="rounded" className={styles.railPin} aria-label={railPinned ? "Recolher módulos automaticamente" : "Fixar módulos sempre abertos"} aria-pressed={railPinned} onClick={toggleRailPinned} icon={<Icon name="pin" />} />
        <div ref={railModulesRef} className={styles.railModules}>{visibleModules.filter((module) => module.id !== "admin").map(railLink)}</div>
        <div className={styles.mobileModuleMenu}>
          <MenuButton variant="ghost" shape="rounded" className={styles.mobileModuleTrigger} icon={<Icon name={current.icon} />} aria-label={`Módulo atual: ${current.title}. Mudar módulo`} menu={<MenuGroup label="Módulos">{visibleModules.filter((module) => module.id !== "admin").map((module) => {
            const target = module.sections.flatMap((section) => section.items).find((item) => allowed(item.capability))?.to ?? module.to;
            return <MenuItem key={module.id} icon={<Icon name={module.icon} />} aria-current={current.id === module.id ? "page" : undefined} onClick={() => { markNavigation(target); void navigate(target); }}>{module.title}</MenuItem>;
          })}</MenuGroup>}><span className={styles.mobileModuleTitle}>{current.title}</span></MenuButton>
        </div>
        <div className={styles.railBottom}>
          <Button iconOnly size="sm" variant="ghost" shape="rounded" className={styles.railLink} aria-label="Pesquisar áreas" onClick={() => setQuickNavigationOpen(true)} icon={<Icon name="search" />}><span className={styles.railLabel}>Pesquisar</span></Button>
          {session.capabilities.includes("users:manage") && <Link to="/admin/users?invite=1" prefetch="intent" onPointerDown={(event) => startLinkNavigation(event, "/admin/users?invite=1")} onClick={(event) => finishLinkNavigation(event, "/admin/users?invite=1")} className={styles.railLink} aria-label="Convidar colegas"><Icon name="team" /><span className={styles.railLabel}>Convidar colegas</span></Link>}
          {visibleModules.filter((module) => module.id === "admin").map(railLink)}
          <div className={styles.accountMenu}><MenuButton iconOnly indicator={false} variant="ghost" shape="rounded" className={`${styles.railLink} ${styles.accountLink}`} aria-label="Perfil" aria-current={current.id === "account" ? "page" : undefined} menu={<><MenuIdentity name={accountProfile.name ?? "Minha conta"} detail="Conta pessoal" avatarUrl={accountProfile.avatarUrl ?? null} /><MenuSeparator /><MenuGroup label="Conta"><MenuItem icon={<Icon name="settings" />} onClick={() => void navigate("/security")}>Segurança da conta</MenuItem></MenuGroup>{ADMIN_CAPABILITIES.some(allowed) && <MenuGroup label="Administração"><MenuItem icon={<Icon name="grid" />} onClick={() => void navigate("/admin")}>Configurações</MenuItem>{session.capabilities.includes("users:manage") && <MenuItem icon={<Icon name="team" />} onClick={() => void navigate("/admin/users?invite=1")}>Convidar colegas</MenuItem>}</MenuGroup>}<MenuSeparator /><MenuItem icon={<Icon name="exit" />} onClick={() => void leaveAccount()}>Sair da conta</MenuItem></>}> 
            {accountProfile.name ? <Avatar name={accountProfile.name} src={accountProfile.avatarUrl ?? null} size="small" /> : <Icon name="account" />}<span className={styles.railLabel}>Perfil</span>
          </MenuButton></div>
        </div>
      </NavigationRail>
      {showSidebar && <Sidebar title={current.title} className={styles.sidebar}>
        {visibleSections.map((section) => {
          const links = section.items.map((item) => <SidebarItem key={item.to} render={<Link ref={pathMatches(location.pathname, item.to, location.search) ? activeSidebarLink : undefined} to={item.to} prefetch="intent" onPointerDown={(event) => startLinkNavigation(event, item.to)} onClick={(event) => finishLinkNavigation(event, item.to)} data-pending={requestedPath && pathMatches(requestedPath, item.to, requestedSearch) || undefined} />} active={pathMatches(location.pathname, item.to, location.search)} icon={current.id === "admin" || current.id === "leads" ? undefined : <Icon name={item.icon} />} count={current.id === "leads" ? leadCounts.get(item.to) : undefined}>{item.label}</SidebarItem>);
          return visibleSections.length === 1 || section.title === "Início"
            ? <div key={section.title} className={styles.singleSection}>{links}</div>
            : <SidebarSection key={`${current.id}:${section.title}`} title={section.title} icon={section.icon ? <Icon name={section.icon} /> : undefined} collapsible={current.id === "admin"} defaultOpen={section.items.some((item) => pathMatches(location.pathname, item.to, location.search))}>{links}</SidebarSection>;
        })}
      </Sidebar>}
      {showSidebar && activeSecondaryItem && <nav className={styles.mobileSecondaryNav} aria-label={`Seções de ${current.title}`}>
        <MenuButton variant="ghost" shape="rounded" className={styles.mobileSecondaryTrigger} icon={<Icon name={activeSecondaryItem.icon} />} aria-label={`Seção atual: ${activeSecondaryItem.label}. Mudar seção`} menu={<>
          {visibleSections.map((section) => <MenuGroup key={section.title} label={section.title}>
            {section.items.map((item) => <MenuItem key={item.to} icon={<Icon name={item.icon} />} aria-current={pathMatches(location.pathname, item.to, location.search) ? "page" : undefined} onClick={() => { markNavigation(item.to); void navigate(item.to); }}>{item.label}</MenuItem>)}
          </MenuGroup>)}
        </>}>{activeSecondaryItem.label}</MenuButton>
      </nav>}
      <main className={styles.conteudo} data-surface={location.pathname === "/inbox" ? "workspace" : "panel"} aria-busy={Boolean(requestedPath)}>
        {topNavigation.length > 0 && <nav ref={moduleTabsRef} className={styles.moduleTabs} aria-label={`Áreas de ${current.title}`}>
          {topNavigation.map((item) =>
            <Link key={item.to} ref={displayedTopTabActive(item) ? activeTopTab : undefined} to={item.to} prefetch="intent" onPointerDown={(event) => startLinkNavigation(event, item.to)} onClick={(event) => finishLinkNavigation(event, item.to)} className={styles.moduleTab} aria-current={!requestedPath && topTabActive(item) ? "page" : undefined} data-pending={requestedPath && pathMatches(requestedPath, item.to, requestedSearch) || undefined}>{item.label}</Link>
          )}
          {tabIndicator && <span className={styles.moduleIndicator} style={{ left: tabIndicator.left, width: tabIndicator.width }} aria-hidden="true" />}
        </nav>}
        <Outlet />
      </main>
      <QuickNavigation open={quickNavigationOpen} onOpenChange={setQuickNavigationOpen} items={quickNavigationItems} onSelect={(to) => { markNavigation(to); void navigate(to); }} />
    </div>
  );
}
