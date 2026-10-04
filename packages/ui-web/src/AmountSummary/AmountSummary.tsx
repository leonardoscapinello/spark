import { Text } from "../Text/Text.js";
import s from "./AmountSummary.module.css";

export interface AmountSummaryProps {
  label: string;
  items: readonly { label: string; value: string }[];
  totalLabel: string;
  total: string;
}

/** Composição compacta de um valor: parcelas alinhadas em linhas e total separado. */
export function AmountSummary({ label, items, totalLabel, total }: AmountSummaryProps) {
  return <dl className={s.root} aria-label={label} aria-live="polite" aria-atomic="true">
    <div className={s.items}>
      {items.map((item) => <div className={s.item} key={item.label}>
        <Text as="dt" size="pequeno" tone="secondary">{item.label}</Text>
        <Text as="dd" size="pequeno" mono>{item.value}</Text>
      </div>)}
    </div>
    <div className={s.total}>
      <Text as="dt" weight="medium">{totalLabel}</Text>
      <Text as="dd" weight="medium" mono>{total}</Text>
    </div>
  </dl>;
}
