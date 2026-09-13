import { Icon, type IconName } from "../Icon/Icon.js";
import styles from "./RecordIdentity.module.css";

export interface RecordIdentityProps {
  title: string;
  subtitle?: string | undefined;
  subtitleVariant?: "default" | "code" | undefined;
  icon: IconName;
}

export function RecordIdentity({ title, subtitle, subtitleVariant = "default", icon }: RecordIdentityProps) {
  return <div className={styles.root}>
    <span className={styles.icon}><Icon name={icon} /></span>
    <span className={styles.copy}><strong>{title}</strong>{subtitle && <small data-variant={subtitleVariant}>{subtitle}</small>}</span>
  </div>;
}
