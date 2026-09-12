import type { ReactNode } from "react";
import styles from "./CollectionToolbar.module.css";

export interface CollectionToolbarProps {
  search?: ReactNode;
  filters?: ReactNode;
  actions?: ReactNode;
  count?: ReactNode;
}

export function CollectionToolbar({ search, filters, actions, count }: CollectionToolbarProps) {
  return <div className={styles.root}>
    {search && <div className={styles.search}>{search}</div>}
    {filters && <div className={styles.filters}>{filters}</div>}
    {actions && <div className={styles.actions}>{actions}</div>}
    {count && <span className={styles.count}>{count}</span>}
  </div>;
}
