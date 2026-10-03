import type { ComponentPropsWithoutRef, ReactNode } from "react";
import styles from "./Toolbar.module.css";

export interface ToolbarProps extends ComponentPropsWithoutRef<"div"> {
  /** Nome do grupo para leitor de tela ("Zoom do fluxo"). */
  label: string;
  children: ReactNode;
}

/**
 * Barra de ferramentas flutuante: folha erguida em pílula (--sf3 + granulação,
 * --e2) com padding 4 e itens a 2px. Leva botões tinta de 28; texto entra por
 * `ToolbarText`; grupos se separam por `ToolbarSeparator`. A posição é de quem
 * usa (className só de layout).
 */
export function Toolbar({ label, className, children, ...rest }: ToolbarProps) {
  return <div role="group" aria-label={label} {...rest} className={[styles.root, className].filter(Boolean).join(" ")}>{children}</div>;
}

/** Fio vertical entre grupos da barra. */
export function ToolbarSeparator() {
  return <span className={styles.separator} aria-hidden="true" />;
}

/** Conteúdo que não é botão (um Signal, uma contagem): respira como um botão. */
export function ToolbarText({ children }: { children: ReactNode }) {
  return <span className={styles.text}>{children}</span>;
}
