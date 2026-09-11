import { Link, Outlet, redirect, useNavigate } from "react-router";
import type { Route } from "./+types/app-layout";
import { Button, Glass } from "@spark/ui-web";
import { restoreSession, signOut } from "../lib/auth.client";
import styles from "./app-layout.module.css";

/**
 * clientLoader, not loader: needs to read localStorage, which only
 * exists in the browser. The route has no data during SSR —
 * HydrateFallback covers that instant (docs/adr/0018: SSR only serves
 * the first visit; from here on the client decides what renders).
 */
export async function clientLoader() {
  const session = await restoreSession();
  if (!session) throw redirect("/login");
  return session;
}

export function HydrateFallback() {
  return <div className={styles.carregando}>Carregando…</div>;
}

export default function AppLayout({ loaderData: session }: Route.ComponentProps) {
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate("/login");
  }

  return (
    <div className={styles.shell}>
      <Glass as="aside" className={styles.sidebar ?? ""}>
        <a className={styles.marca} href="/" aria-label="Leonardo Scapinello">
          <img src="/brand/leonardo-scapinello-ink.svg" alt="Leonardo Scapinello" />
        </a>
        <nav className={styles.nav}>
          <Link to="/dashboard" className={styles.navItem}>Visão geral</Link>
          {session.capabilities.includes("inbox:read") && (
            <Link to="/inbox" className={styles.navItem}>Inbox</Link>
          )}
          {session.capabilities.includes("automations:read") && (
            <Link to="/automations" className={styles.navItem}>Automações</Link>
          )}
          {session.capabilities.includes("contacts:read") && (
            <Link to="/" className={styles.navItem}>Contatos</Link>
          )}
          {session.capabilities.includes("companies:read") && (
            <Link to="/companies" className={styles.navItem}>Empresas</Link>
          )}
          {session.capabilities.includes("deals:read") && (
            <Link to="/deals" className={styles.navItem}>Negócios</Link>
          )}
          {session.capabilities.includes("activities:read") && (
            <Link to="/activities" className={styles.navItem}>
              Atividades
            </Link>
          )}
          {session.capabilities.includes("users:manage") && (
            <Link to="/admin/users" className={styles.navItem}>
              Usuários
            </Link>
          )}
          {session.capabilities.includes("users:manage") && (
            <Link to="/admin/teams" className={styles.navItem}>Times</Link>
          )}
          {session.capabilities.includes("permission_groups:manage") && (
            <Link to="/admin/permission-groups" className={styles.navItem}>
              Permissões
            </Link>
          )}
          {session.capabilities.includes("audit_logs:read") && (
            <Link to="/admin/audit-log" className={styles.navItem}>
              Auditoria
            </Link>
          )}
          {session.capabilities.includes("integrations:read") && (
            <Link to="/integrations" className={styles.navItem}>Integrações</Link>
          )}
          {session.capabilities.includes("files:read") && (
            <Link to="/files" className={styles.navItem}>Arquivos</Link>
          )}
          {session.capabilities.includes("catalog:read") && (
            <Link to="/catalog" className={styles.navItem}>Catálogo</Link>
          )}
          {session.capabilities.includes("forms:read") && (
            <Link to="/forms" className={styles.navItem}>Formulários</Link>
          )}
          <Link to="/security" className={styles.navItem}>Segurança</Link>
        </nav>
        <Button variant="ghost" size="sm" onClick={handleSignOut} className={styles.sair}>
          Sair
        </Button>
      </Glass>
      <main className={styles.conteudo}>
        <Outlet />
      </main>
    </div>
  );
}
