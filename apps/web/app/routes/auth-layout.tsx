import { Outlet } from "react-router";
import styles from "./login.module.css";

export default function AuthLayout() {
  return (
    <main className={styles.container}>
      <section className={styles.intro} aria-label="Apresentação">
        <a className={styles.logoLink} href="/login" aria-label="Leonardo Scapinello">
          <img className={styles.logo} src="/brand/leonardo-scapinello-ink.svg" alt="Leonardo Scapinello" />
        </a>
        <div className={styles.introCopy}>
          <h1 className={styles.titulo}>Contatos, conversas e negócios em um só lugar.</h1>
          <p className={styles.subtitulo}>Acompanhe o trabalho da equipe e continue de onde parou.</p>
        </div>
        <p className={styles.rodape}>© Leonardo Scapinello</p>
      </section>

      <section className={styles.access} aria-label="Acesso">
        <Outlet />
      </section>
    </main>
  );
}
