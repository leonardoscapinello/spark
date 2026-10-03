import type { IconName } from "../Icon/Icon.js";
import { IconTile } from "../IconTile/IconTile.js";
import styles from "./RecordIdentity.module.css";

export interface RecordIdentityProps {
  title: string;
  subtitle?: string | undefined;
  subtitleVariant?: "default" | "code" | undefined;
  icon: IconName;
}

/** Identidade de registro sem pessoa (produto, formulário, página): disco do ícone + duas linhas. */
export function RecordIdentity({ title, subtitle, subtitleVariant = "default", icon }: RecordIdentityProps) {
  return <div className={styles.root}>
    <IconTile icon={icon} size="sm" />
    <span className={styles.copy}><strong>{title}</strong>{subtitle && <small data-variant={subtitleVariant}>{subtitle}</small>}</span>
  </div>;
}
