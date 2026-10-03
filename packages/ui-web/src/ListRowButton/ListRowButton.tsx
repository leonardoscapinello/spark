import type { ComponentPropsWithoutRef, CSSProperties, ReactNode } from "react";
import type { IconName } from "../Icon/Icon.js";
import { ListRow } from "../ListRow/ListRow.js";
import styles from "./ListRowButton.module.css";

export interface ListRowButtonProps extends Omit<ComponentPropsWithoutRef<"button">, "title" | "children" | "type" | "className"> {
  title: string;
  /** Segunda linha curta (o que a escolha faz). */
  description?: ReactNode;
  /** Ícone no disco cavado de 28. */
  icon?: IconName | undefined;
  /** Avatar ou outro encaixe de 32 no lugar do disco. */
  leading?: ReactNode;
  /** Cor do ponto antes do título — a cor do tipo (var(--v1)…). Sem ela, sem ponto. */
  dot?: string | undefined;
  /** Item aberto agora: folha pousada em --r-rico. */
  selected?: boolean | undefined;
  /** Ações da linha (subir, descer, remover) — fora do botão, à direita. */
  actions?: ReactNode;
  /** Posição na lista, para a entrada em cascata. */
  index?: number | undefined;
}

/**
 * Linha de lista que é uma escolha: paleta de etapas, catálogo de blocos,
 * estrutura de uma página. É a ListRow (disco de 32, título 13/500, apoio 12,
 * separador recuado, realce --acs, seleção em folha) com o botão cobrindo a
 * linha toda. Vive dentro de `RowList`.
 */
export function ListRowButton({ title, description, icon, leading, dot, selected = false, actions, index, ...button }: ListRowButtonProps) {
  const label = dot
    ? <span className={styles.title}><span className={styles.dot} style={{ "--row-dot": dot } as CSSProperties} aria-hidden="true" /><span className={styles.titleText}>{title}</span></span>
    : title;
  return <ListRow
    title={label}
    description={description}
    leading={leading}
    selected={selected}
    trailing={actions}
    {...(icon ? { icon } : {})}
    {...(index === undefined ? {} : { index })}
    render={<RowButton {...button} aria-current={selected ? "true" : undefined} />}
  />;
}

/** O botão recebe a classe da linha (ListRow) e soma a sua, que só zera o nativo. */
function RowButton({ className, ...props }: ComponentPropsWithoutRef<"button">) {
  return <button type="button" {...props} className={[className, styles.button].filter(Boolean).join(" ")} />;
}
