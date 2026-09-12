import type { ReactNode } from "react";
import { Icon, type IconName } from "../Icon/Icon.js";
import styles from "./PageHeader.module.css";

export interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  icon?: IconName;
  description?: string;
  actions?: ReactNode;
  back?: ReactNode;
}

export function PageHeader({ eyebrow, title, icon, description, actions, back }: PageHeaderProps) {
  return (
    <header className={styles.header}>
      {back && <div className={styles.back}>{back}</div>}
      <div className={styles.copy} data-icon={icon ? "true" : undefined}>
        {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
        <div className={styles.titleRow}>{icon && <Icon name={icon} className={styles.titleIcon} />}<h1>{title}</h1></div>
        {description && <p className={styles.description}>{description}</p>}
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </header>
  );
}
