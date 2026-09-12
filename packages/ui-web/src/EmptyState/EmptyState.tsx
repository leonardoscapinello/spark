import type { ReactNode } from "react";
import { Icon, type IconName } from "../Icon/Icon.js";
import styles from "./EmptyState.module.css";

export interface EmptyStateProps {
  icon: IconName;
  title: string;
  description: string;
  action?: ReactNode;
  secondaryAction?: ReactNode;
}

export function EmptyState({ icon, title, description, action, secondaryAction }: EmptyStateProps) {
  return <section className={styles.root} aria-label={title}>
    <span className={styles.icon}><Icon name={icon} /></span>
    <h2>{title}</h2>
    <p>{description}</p>
    {(action || secondaryAction) && <div className={styles.actions}>{action}{secondaryAction}</div>}
  </section>;
}
