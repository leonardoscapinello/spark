import type { CSSProperties, ReactNode } from "react";
import { Button } from "../Button/Button.js";
import { Icon, type IconName } from "../Icon/Icon.js";
import s from "./ActionList.module.css";

export interface ActionListItem {
  id: string;
  label: string;
  /** Cor do ponto de 8px (a cor da etapa). Sem ela, sem ponto. */
  dot?: string | null;
  /** Ícone no lugar do ponto. */
  icon?: ReactNode;
  /** Item atual: folha pousada, sem ação. */
  current?: boolean;
  disabled?: boolean;
  /** Seta à direita: chevronRight avança, chevronLeft volta. */
  trailingIcon?: IconName;
  /** Nome acessível completo («Avançar: Proposta»). */
  ariaLabel?: string;
}

export interface ActionListProps {
  label: string;
  items: readonly ActionListItem[];
  onSelect: (id: string) => void;
}

/**
 * Lista de escolhas (mover etapa, trocar destino): linhas de 40 em pílula,
 * texto à esquerda, ponto da cor antes e seta à direita. A linha é o Button
 * "row": tinta parada, realce no hover, folha pousada quando é a atual. Uma
 * lista de escolhas tem um desenho só — nunca botões cinza centralizados.
 */
export function ActionList({ label, items, onSelect }: ActionListProps) {
  return <ul className={s.root} aria-label={label}>
    {items.map((item) => <li key={item.id}>
      <Button
        variant="row"
        className={s.row}
        data-selected={item.current || undefined}
        aria-current={item.current ? "step" : undefined}
        aria-label={item.ariaLabel ?? item.label}
        disabled={item.disabled}
        onClick={() => { if (!item.current) onSelect(item.id); }}
      >
        {item.icon ? <span className={s.leading} aria-hidden="true">{item.icon}</span>
          : item.dot ? <span className={s.dot} aria-hidden="true" style={{ "--action-dot": item.dot } as CSSProperties} /> : null}
        <span className={s.label}>{item.label}</span>
        {item.current ? <span className={s.current}>atual</span> : <span className={s.trailing} aria-hidden="true"><Icon name={item.trailingIcon ?? "chevronRight"} /></span>}
      </Button>
    </li>)}
  </ul>;
}
