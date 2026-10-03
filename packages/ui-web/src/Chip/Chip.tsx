import type { CSSProperties, ReactNode } from "react";
import { Button } from "../Button/Button.js";
import { Icon, type IconName } from "../Icon/Icon.js";
import s from "./Chip.module.css";

export type ChipTone = "neutral" | "success" | "warning" | "danger" | "info" | "ink";

export interface ChipProps {
  children: ReactNode;
  /** Estado só quando significa (fundo suave + tinta do estado). Neutro é a etiqueta. */
  tone?: ChipTone;
  /**
   * Ponto de 6px antes do texto. `true` usa a tinta do próprio chip; um texto
   * é a cor (token ou cor da etiqueta). A cor da etiqueta mora no ponto, nunca
   * no fundo nem numa borda grossa.
   */
  dot?: string | boolean | null;
  /** sm 20 (cartão do kanban) · md 22 (etiqueta e selo). */
  size?: "sm" | "md";
  title?: string;
  /** Ícone de 12 antes do texto (etiqueta com ícone). */
  icon?: IconName;
  /** Etiqueta removível: × de 18 no fim. */
  onRemove?: () => void;
  removeLabel?: string;
}

/**
 * Etiqueta, selo e status (origem: Controles, "Badge, tag e selo"; Kanban,
 * "chip-origem"). Pílula baixa de papel cavado, tinta 2, sem borda. É o único
 * desenho de etiqueta do produto: etiqueta de negócio, etapa, situação.
 */
export function Chip({ children, tone = "neutral", dot, size = "md", title, icon, onRemove, removeLabel }: ChipProps) {
  const color = typeof dot === "string" ? dot : undefined;
  return <span className={s.root} data-tone={tone} data-size={size} title={title} style={color ? { "--chip-dot": color } as CSSProperties : undefined}>
    {dot ? <span className={s.dot} aria-hidden="true" /> : null}
    {icon && <span className={s.icon} aria-hidden="true"><Icon name={icon} /></span>}
    <span className={s.label}>{children}</span>
    {onRemove && <Button variant="ghost" size="sm" iconOnly className={s.remove} icon={<Icon name="close" />} aria-label={removeLabel ?? "Remover etiqueta"} onClick={onRemove} />}
  </span>;
}
