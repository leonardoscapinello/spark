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
          <p className={styles.eyebrow}>Relacionamento</p>
          <h1 className={styles.titulo}>O contexto certo para cada conversa.</h1>
          <p className={styles.subtitulo}>Organize contatos, conversas e oportunidades em um espaço feito para o seu time.</p>
        </div>
        <p className={styles.rodape}>© Leonardo Scapinello</p>
      </section>

      <section className={styles.access} aria-label="Acesso">
        <Outlet />
      </section>
    </main>
  );
}
