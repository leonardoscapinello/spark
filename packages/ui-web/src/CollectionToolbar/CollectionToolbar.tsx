import type { ReactNode } from "react";
import styles from "./CollectionToolbar.module.css";

export interface CollectionToolbarProps {
  search?: ReactNode;
  filters?: ReactNode;
  count?: ReactNode;
}

export function CollectionToolbar({ search, filters, count }: CollectionToolbarProps) {
  return <div className={styles.root}>
    {search && <div className={styles.search}>{search}</div>}
    {filters && <div className={styles.filters}>{filters}</div>}
    {count && <span className={styles.count}>{count}</span>}
  </div>;
}
