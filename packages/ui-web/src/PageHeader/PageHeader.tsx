import type { ReactNode } from "react";
import type { IconName } from "../Icon/Icon.js";
import styles from "./PageHeader.module.css";

export interface PageHeaderProps {
  /** Contexto acima do título (ex.: "Administração"), em mono 11 tinta 3. */
  eyebrow?: string;
  title: ReactNode;
  /** @deprecated Mantido por compatibilidade: o título da identidade não leva ícone — a navegação já diz onde se está. */
  icon?: IconName;
  description?: string;
  actions?: ReactNode;
  back?: ReactNode;
}

/**
 * Cabeçalho de página (origem: Tipografia, "H1 · página"; Responsivo, shell):
 * título 500 em 22 no celular e 28 a partir de 1024, tracking negativo, uma
 * frase de apoio em tinta 2 e as ações à direita.
 */
export function PageHeader({ eyebrow, title, description, actions, back }: PageHeaderProps) {
  return (
    <header className={styles.header}>
      {back && <div className={styles.back}>{back}</div>}
      <div className={styles.copy}>
        {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p className={styles.description}>{description}</p>}
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </header>
  );
}
