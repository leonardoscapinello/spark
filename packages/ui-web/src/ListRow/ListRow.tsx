import { cloneElement, type ComponentPropsWithoutRef, type CSSProperties, type ReactElement, type ReactNode } from "react";
import type { IconName } from "../Icon/Icon.js";
import { IconTile } from "../IconTile/IconTile.js";
import s from "./ListRow.module.css";

export interface ListRowProps extends Omit<ComponentPropsWithoutRef<"li">, "title" | "children"> {
  title: ReactNode;
  /** Segunda linha curta em tinta 3 (pessoa, etapa, um Signal). */
  description?: ReactNode;
  /** Terceira linha (prévia, observação), no máximo duas linhas de texto. */
  detail?: ReactNode;
  /** Data, hora ou valor: mono, à direita. */
  meta?: ReactNode;
  /** Ícone num disco cavado (atividade, conversa, arquivo). */
  icon?: IconName;
  /** Avatar de 32 no lugar do disco (pessoa, empresa). */
  leading?: ReactNode;
  /** Ações da linha — irmãs do link, nunca dentro dele. */
  trailing?: ReactNode;
  /** Concluído: título riscado em tinta 3. */
  done?: boolean;
  /** Item aberto/selecionado: folha pousada em --r-rico. */
  selected?: boolean;
  /** Torna a linha um link (`<Link to=…/>`): o realce cobre a linha toda. */
  render?: ReactElement<{ className?: string; children?: ReactNode }>;
  /** Posição na lista: a entrada em cascata usa 30 ms por item. */
  index?: number;
  /** Linha sendo arrastada para reordenar: fica esmaecida no lugar. */
  dragging?: boolean;
}

/**
 * Linha de lista densa (origem: Notificações §4 e Atividade §16 do perfil;
 * auditoria de componentes, "Linha de lista"): encaixe de 32 para avatar ou
 * disco, até três linhas — título 13/500, apoio 12 em tinta 3 e detalhe —,
 * data em mono à direita e ações no fim. Separador recuado até o texto;
 * seleção em folha --r-rico. Negócios de uma pessoa, conversas, atividades e
 * itens usam esta linha — nenhuma tela desenha a sua.
 */
export function ListRow({ title, description, detail, meta, icon, leading, trailing, done = false, selected = false, render, index, dragging = false, className, style, ...rest }: ListRowProps) {
  const slot = leading ?? (icon ? <IconTile icon={icon} size="sm" /> : null);
  const main = <>
    {slot && <span className={s.leading}>{slot}</span>}
    <span className={s.copy}>
      <span className={s.title}>{title}</span>
      {description !== undefined && description !== null && <span className={s.description}>{description}</span>}
      {detail !== undefined && detail !== null && <span className={s.detail}>{detail}</span>}
    </span>
    {meta !== undefined && meta !== null && <span className={s.meta}>{meta}</span>}
  </>;
  return <li {...rest} className={[s.root, className].filter(Boolean).join(" ")} data-done={done || undefined} data-selected={selected || undefined} data-dragging={dragging || undefined} data-link={render ? "" : undefined} data-leading={slot ? "" : undefined} style={index === undefined ? style : { ...style, "--i": index } as CSSProperties}>
    {render ? cloneElement(render, { className: s.main ?? "", children: main }) : <div className={s.main}>{main}</div>}
    {trailing && <span className={s.trailing}>{trailing}</span>}
  </li>;
}

/** A lista que recebe as linhas: separador recuado entre elas. */
export function RowList({ label, children }: { label?: string; children: ReactNode }) {
  return <ul className={s.list} aria-label={label}>{children}</ul>;
}
