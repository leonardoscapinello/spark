import { Tabs as BaseTabs } from "@base-ui/react/tabs";
import type { ReactNode } from "react";
import styles from "./Tabs.module.css";
export interface TabItem { value: string; label: string; content: ReactNode; disabled?: boolean }
export interface TabsProps { items: readonly TabItem[]; label: string; value?: string; defaultValue?: string; onValueChange?: (value: string) => void }
export function Tabs({ items, label, value, defaultValue, onValueChange }: TabsProps) {
  return <BaseTabs.Root value={value} defaultValue={defaultValue ?? items.find(i => !i.disabled)?.value} onValueChange={v => { if (typeof v === "string") onValueChange?.(v); }} className={styles.root}>
    <BaseTabs.List className={styles.list} aria-label={label} activateOnFocus>
      {items.map(item => <BaseTabs.Tab key={item.value} value={item.value} disabled={item.disabled} className={styles.tab}>{item.label}</BaseTabs.Tab>)}
      <BaseTabs.Indicator className={styles.indicator} />
    </BaseTabs.List>
    {items.map(item => <BaseTabs.Panel key={item.value} value={item.value} className={styles.panel} keepMounted>{item.content}</BaseTabs.Panel>)}
  </BaseTabs.Root>;
}
