import type { ReactNode } from "react";
import { Icon, type IconName } from "../Icon/Icon.js";
import { Avatar } from "../Avatar/Avatar.js";
import { PageHeader } from "../PageHeader/PageHeader.js";
import styles from "./RecordHero.module.css";

export interface RecordMetric {
  label: string;
  value: ReactNode;
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
      <PageHeader title={title} {...(eyebrow ? { eyebrow } : {})} {...(description ? { description } : {})} {...(actions ? { actions } : {})} />
    </div>
    {metrics.length > 0 && <dl className={styles.metrics}>{metrics.map((metric) => <div key={metric.label}>
      <dt>{metric.label}</dt>
      <dd data-tone={metric.tone}>{metric.value}</dd>
    </div>)}</dl>}
  </section>;
}
