import { Outlet } from "react-router";
import { AuthShell } from "@spark/ui-web";
import styles from "./login.module.css";

export default function AuthLayout() {
  return (
    <AuthShell
      brand={<a className={styles.brand} href="/login" aria-label="Leonardo Scapinello"><img src="/brand/leonardo-scapinello-ink.svg" alt="Leonardo Scapinello" /></a>}
      headline="Cada pessoa. Todo o contexto."
      lead="Atendimento, negócios e automações conectados para a sua equipe."
      footer="© Leonardo Scapinello"
    >
      <Outlet />
    </AuthShell>
  );
}
