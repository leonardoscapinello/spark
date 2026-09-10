import { Link, Outlet, redirect, useNavigate } from "react-router";
import { Button, Glass } from "@spark/ui-web";
import { limparSessao, obterToken } from "../lib/auth.client";
import styles from "./app-layout.module.css";

/**
 * clientLoader, não loader: precisa ler localStorage, que só existe no
 * navegador. A rota fica sem dado durante o SSR — HydrateFallback cobre
 * esse instante (docs/adr/0018: SSR só serve a primeira visita; a partir
 * daqui quem decide o que renderiza é o cliente).
 */
export async function clientLoader() {
  const token = obterToken();
  if (!token) throw redirect("/login");
  return null;
}

export function HydrateFallback() {
  return <div className={styles.carregando}>Carregando…</div>;
}

export default function AppLayout() {
  const navigate = useNavigate();

  function sair() {
    limparSessao();
    navigate("/login");
  }

  return (
    <div className={styles.shell}>
      <Glass as="aside" className={styles.sidebar ?? ""}>
        <div className={styles.marca}>Spark</div>
        <nav className={styles.nav}>
          <Link to="/" className={styles.navItem}>
            Contatos
          </Link>
        </nav>
        <Button variant="ghost" size="sm" onClick={sair} className={styles.sair}>
          Sair
        </Button>
      </Glass>
      <main className={styles.conteudo}>
        <Outlet />
      </main>
    </div>
  );
}
