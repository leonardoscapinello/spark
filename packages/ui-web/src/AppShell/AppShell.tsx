import type { ComponentProps, ReactNode } from "react";
import styles from "./AppShell.module.css";

/**
 * Casco do app: grade de trilho, sidebar da área e folha de conteúdo. A tela
 * de layout só decide o que vai em cada lugar; papel, folga, raio e a física
 * de abrir o trilho são daqui. Abaixo de 760 px vira coluna.
 */
export function AppShell({ sidebar = "visible", children, className, ...props }: ComponentProps<"div"> & { sidebar?: "visible" | "hidden" | undefined }) {
  return <div {...props} data-sidebar={sidebar} className={[styles.root, className].filter(Boolean).join(" ")}>{children}</div>;
}

/**
 * Folha de conteúdo do casco. `tabs` (abas da área) e `notice` ficam presos no
 * alto e não animam; a tela (`children`) entra subindo a cada troca.
 * `busy` mostra o traço de navegação até a próxima tela chegar.
 */
export function AppContent({ surface = "panel", busy = false, tabs, notice, children, className, ...props }: Omit<ComponentProps<"main">, "children"> & {
  surface?: "panel" | "workspace" | "record" | undefined;
  busy?: boolean | undefined;
  tabs?: ReactNode;
  notice?: ReactNode;
  children: ReactNode;
}) {
  return <main {...props} data-surface={surface} aria-busy={busy || undefined} className={[styles.content, className].filter(Boolean).join(" ")}>
    {tabs}
    {notice && <div className={styles.notice}>{notice}</div>}
    <div className={styles.body}>{children}</div>
  </main>;
}
