import { useId, type ReactNode } from "react";
import styles from "./SettingsSection.module.css";

export function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
  const titleId = useId();
  return <section className={styles.root} aria-labelledby={titleId}>
    <h2 id={titleId}>{title}</h2>
    <div className={styles.grid}>{children}</div>
  </section>;
}
