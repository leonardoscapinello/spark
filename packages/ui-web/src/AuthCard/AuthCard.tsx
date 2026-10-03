import type { ReactNode } from "react";
import { Spinner } from "../Feedback/Feedback.js";
import styles from "./AuthCard.module.css";

export interface AuthCardProps {
  title: string;
  description?: ReactNode;
  /** Marca acima do título (logotipo ou símbolo). */
  mark?: ReactNode;
  /** Enquanto entra, envia ou prepara: o conteúdo dá lugar ao ensō e a uma frase. */
  pending?: string;
  children?: ReactNode;
}

/**
 * Cartão de acesso (origem: Padrões, "Login"): folha erguida (--e2) de raio
 * 44, padding 32 28, título 500 22 e uma frase em tinta 2. Login, recuperação
 * e nova senha usam o mesmo cartão — a tela só põe o formulário dentro.
 */
export function AuthCard({ title, description, mark, pending, children }: AuthCardProps) {
  return <section className={styles.card} aria-label={title} aria-busy={pending ? true : undefined}>
    {pending
      ? <div className={styles.pending} role="status"><Spinner /><span>{pending}</span></div>
      : <>
        <header className={styles.header}>
          {mark && <span className={styles.mark}>{mark}</span>}
          <h1>{title}</h1>
          {description && <p>{description}</p>}
        </header>
        {children}
      </>}
  </section>;
}

export interface AuthShellProps {
  brand: ReactNode;
  headline: string;
  lead?: string;
  footer?: ReactNode;
  children: ReactNode;
}

/**
 * Casca das telas de acesso: à esquerda a marca e uma frase sobre a mesa; à
 * direita a moldura cavada (raio 56) onde o cartão de acesso pousa. No
 * celular fica só a marca em cima e o cartão.
 */
export function AuthShell({ brand, headline, lead, footer, children }: AuthShellProps) {
  return <main className={styles.shell}>
    <section className={styles.intro} aria-label="Apresentação">
      <div className={styles.brand}>{brand}</div>
      <div className={styles.introCopy}>
        <p className={styles.headline}>{headline}</p>
        {lead && <p className={styles.lead}>{lead}</p>}
      </div>
      {footer && <p className={styles.footer}>{footer}</p>}
    </section>
    <section className={styles.stage} aria-label="Acesso">{children}</section>
  </main>;
}
