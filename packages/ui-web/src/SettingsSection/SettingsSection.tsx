import { useId, type ReactNode } from "react";
import styles from "./SettingsSection.module.css";

/** Grupo de configurações: título 500 15 e uma grade de cartões. */
export function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
  const titleId = useId();
  return <section className={styles.root} aria-labelledby={titleId}>
    <h2 id={titleId}>{title}</h2>
    <div className={styles.grid}>{children}</div>
  </section>;
}

/**
 * Linha de configuração (origem: Padrões, "Configurações"): o que é, uma frase
 * de apoio e a ação à direita. As linhas se separam por um fio; no celular a
 * ação desce para baixo do texto.
 */
export function SettingsRow({ title, description, children }: { title: ReactNode; description?: ReactNode; children?: ReactNode }) {
  return <div className={styles.row}>
    <div className={styles.rowCopy}><span className={styles.rowTitle}>{title}</span>{description && <span className={styles.rowDescription}>{description}</span>}</div>
    {children && <div className={styles.rowAction}>{children}</div>}
  </div>;
}
