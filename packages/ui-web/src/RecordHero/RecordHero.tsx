import type { ReactNode } from "react";
import { Icon, type IconName } from "../Icon/Icon.js";
import { Avatar } from "../Avatar/Avatar.js";
import styles from "./RecordHero.module.css";

export interface RecordMetric {
  label: string;
  value: ReactNode;
  icon?: IconName;
  tone?: "success" | "danger";
}

export interface RecordHeroProps {
  icon: IconName;
  avatarName?: string;
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  metrics?: readonly RecordMetric[];
}

export function RecordHero({ icon, avatarName, eyebrow, title, description, actions, metrics = [] }: RecordHeroProps) {
  return <section className={styles.root} aria-label={title} data-person={Boolean(avatarName)}>
    <div className={styles.identity}>
      {avatarName ? <Avatar name={avatarName} size="hero" /> : <span className={styles.avatar}><Icon name={icon} /></span>}
      <div className={styles.copy}>
        <div className={styles.titleLine}><h1>{title}</h1>{eyebrow && <span className={styles.context}>{eyebrow}</span>}</div>
        {description && <p className={styles.description}>{description}</p>}
        {metrics.length > 0 && <dl className={styles.metrics}>{metrics.map((metric) => <div key={metric.label}>
          {metric.icon && <Icon name={metric.icon} />}
          <dt>{metric.label}</dt>
          <dd data-tone={metric.tone}>{metric.value}</dd>
        </div>)}</dl>}
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </div>
  </section>;
}

export function RecordPageHeader({ back, ...hero }: RecordHeroProps & { back: ReactNode }) {
  return <div className={styles.pageHeader}>
    <div className={styles.back}>{back}</div>
    <RecordHero {...hero} />
  </div>;
}
