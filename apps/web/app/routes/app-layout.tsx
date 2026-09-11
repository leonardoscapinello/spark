import { Link, Outlet, redirect, useNavigate } from "react-router";
import { Button, Glass } from "@spark/ui-web";
import { clearSession, getToken } from "../lib/auth.client";
import styles from "./app-layout.module.css";

/**
 * clientLoader, not loader: needs to read localStorage, which only
 * exists in the browser. The route has no data during SSR —
 * HydrateFallback covers that instant (docs/adr/0018: SSR only serves
 * the first visit; from here on the client decides what renders).
 */
export async function clientLoader() {
  const token = getToken();
  if (!token) throw redirect("/login");
  return null;
}

export function HydrateFallback() {
  return <div className={styles.carregando}>Carregando…</div>;
}

export default function AppLayout() {
  const navigate = useNavigate();

  function signOut() {
    clearSession();
    navigate("/login");
  }

  return (
    <div className={styles.shell}>
      <Glass as="aside" className={styles.sidebar ?? ""}>
        <a className={styles.marca} href="/" aria-label="Leonardo Scapinello">
          <img src="/brand/leonardo-scapinello-ink.svg" alt="Leonardo Scapinello" />
        </a>
        <nav className={styles.nav}>
          <Link to="/" className={styles.navItem}>
            Contatos
          </Link>
          <Link to="/deals" className={styles.navItem}>
            Negócios
          </Link>
        </nav>
        <Button variant="ghost" size="sm" onClick={signOut} className={styles.sair}>
          Sair
        </Button>
      </Glass>
      <main className={styles.conteudo}>
        <Outlet />
      </main>
    </div>
  );
}
