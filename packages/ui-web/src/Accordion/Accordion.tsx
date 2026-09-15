import { Accordion as BaseAccordion } from "@base-ui/react/accordion";
import type { ReactNode } from "react";
import { Icon } from "../Icon/Icon.js";
import styles from "./Accordion.module.css";
export interface AccordionItem {
  value: string;
  title: string;
  icon?: ReactNode;
  content: ReactNode;
  disabled?: boolean;
  /**
   * Aviso na aba fechada: quantos campos em branco há lá dentro, e de que
   * nível. Sem isso, dizer «origem é importante e está vazia» obriga a abrir
   * seção por seção para descobrir onde preencher.
   *
   * Vermelho para obrigatório, laranja para importante — a mesma cor que o
   * campo usa, para não haver um código de cor por tela.
   */
  badge?: { level: "required" | "important"; count: number; label: string };
}
export interface AccordionProps { items: readonly AccordionItem[]; defaultValue?: string[]; value?: string[]; onValueChange?: (value: string[]) => void; multiple?: boolean }
export function Accordion({ items, multiple = true, ...props }: AccordionProps) {
  return <BaseAccordion.Root<string> className={styles.root} multiple={multiple} {...props}>
    {items.map(item => <BaseAccordion.Item key={item.value} value={item.value} disabled={item.disabled ?? false} className={styles.item}>
      <BaseAccordion.Header className={styles.header}><BaseAccordion.Trigger className={styles.trigger}>
        {item.icon}<span className={styles.title}>{item.title}</span>{item.badge && item.badge.count > 0 && <span className={styles.badge} data-level={item.badge.level} title={item.badge.label} aria-label={item.badge.label}>{item.badge.count}</span>}<span className={styles.chevron}><Icon name="chevron" /></span>
      </BaseAccordion.Trigger></BaseAccordion.Header>
      <BaseAccordion.Panel className={styles.panel}><div className={styles.content}>{item.content}</div></BaseAccordion.Panel>
    </BaseAccordion.Item>)}
  </BaseAccordion.Root>;
}
