import type { ReactNode } from "react";
import s from "./SectionTitle.module.css";

/**
 * Título da identidade (origem: escala tipográfica). Tela não escolhe tamanho
 * nem peso de título (ADR-0045): escolhe o nível.
 * page 28/500 · section 22/500 · card 15/500 · block 13/500, com ícone,
 * linha de apoio (eyebrow/meta) e ações alinhadas na mesma linha de base.
 */
export function SectionTitle({ level = "card", as, icon, meta, description, actions, children }: { level?: "page" | "section" | "card" | "block"; as?: "h1" | "h2" | "h3" | "h4"; icon?: ReactNode; meta?: ReactNode; description?: ReactNode; actions?: ReactNode; children: ReactNode }) {
  const Heading = as ?? (level === "page" ? "h1" : level === "section" ? "h2" : level === "card" ? "h3" : "h4");
  return <div className={s.root} data-level={level}>
    <div className={s.copy}>
      {meta && <span className={s.meta}>{meta}</span>}
      <Heading className={s.title}>{icon && <span className={s.icon} aria-hidden="true">{icon}</span>}{children}</Heading>
      {description && <p className={s.description}>{description}</p>}
    </div>
    {actions && <div className={s.actions}>{actions}</div>}
  </div>;
}
