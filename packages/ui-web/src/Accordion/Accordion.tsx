import { Accordion as BaseAccordion } from "@base-ui/react/accordion";
import type { ReactNode } from "react";
import { Icon } from "../Icon/Icon.js";
import styles from "./Accordion.module.css";
export interface AccordionItem { value: string; title: string; icon?: ReactNode; content: ReactNode; disabled?: boolean }
export interface AccordionProps { items: readonly AccordionItem[]; defaultValue?: string[]; value?: string[]; onValueChange?: (value: string[]) => void; multiple?: boolean }
export function Accordion({ items, multiple = true, ...props }: AccordionProps) {
  return <BaseAccordion.Root<string> className={styles.root} multiple={multiple} {...props}>
    {items.map(item => <BaseAccordion.Item key={item.value} value={item.value} disabled={item.disabled ?? false} className={styles.item}>
      <BaseAccordion.Header className={styles.header}><BaseAccordion.Trigger className={styles.trigger}>
        {item.icon}<span className={styles.title}>{item.title}</span><span className={styles.chevron}><Icon name="chevron" /></span>
      </BaseAccordion.Trigger></BaseAccordion.Header>
      <BaseAccordion.Panel className={styles.panel}><div className={styles.content}>{item.content}</div></BaseAccordion.Panel>
    </BaseAccordion.Item>)}
  </BaseAccordion.Root>;
}
