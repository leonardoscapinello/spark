import type { ReactNode } from "react";
import { Icon, type IconName } from "../Icon/Icon.js";
import { Avatar } from "../Avatar/Avatar.js";
import { Chip } from "../Chip/Chip.js";
import { IconTile } from "../IconTile/IconTile.js";
import styles from "./RecordHero.module.css";

export interface RecordMetric {
  label: string;
  value: ReactNode;
  icon?: IconName;
  tone?: "success" | "danger";
  /** Número, dinheiro ou data: mono tabular. */
  numeric?: boolean;
}

export interface RecordHeroProps {
  icon: IconName;
  /** Nome que vira avatar em pigmento (pessoa, empresa). Sem ele, o disco do ícone. */
  avatarName?: string;
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  metrics?: readonly RecordMetric[];
}

/**
 * Cabeçalho de ficha (pessoa, empresa): avatar de 56 em pigmento, nome 22/500,
 * o tipo num chip neutro, apoio em tinta 3 e métricas «rótulo valor» numa
 * linha. Ações à direita, alinhadas pela base.
 */
export function RecordHero({ icon, avatarName, eyebrow, title, description, actions, metrics = [] }: RecordHeroProps) {
  return <section className={styles.root} aria-label={title}>
    {avatarName ? <Avatar name={avatarName} size="hero" /> : <IconTile icon={icon} size="xl" />}
    <div className={styles.copy}>
      <div className={styles.titleLine}><h1>{title}</h1>{eyebrow && <Chip>{eyebrow}</Chip>}</div>
      {description && <p className={styles.description}>{description}</p>}
      {metrics.length > 0 && <dl className={styles.metrics}>{metrics.map((metric) => <div key={metric.label}>
        {metric.icon && <Icon name={metric.icon} />}
        <dt>{metric.label}</dt>
        <dd data-tone={metric.tone} data-numeric={metric.numeric || undefined}>{metric.value}</dd>
      </div>)}</dl>}
    </div>
    {actions && <div className={styles.actions}>{actions}</div>}
  </section>;
}

export function RecordPageHeader({ back, ...hero }: RecordHeroProps & { back: ReactNode }) {
  return <div className={styles.pageHeader}>
    {back && <div className={styles.back}>{back}</div>}
    <RecordHero {...hero} />
  </div>;
}
