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
    {(search || filters) && <div className={styles.filterRow}>
      {search && <div className={styles.search}>{search}</div>}
      {filters && <div className={styles.filters}>{filters}</div>}
    </div>}
    {(count || actions) && <div className={styles.summaryRow}>
      {count && <span className={styles.count}>{count}</span>}
      {actions && <div className={styles.actions}>{actions}</div>}
    </div>}
  </div>;
}
