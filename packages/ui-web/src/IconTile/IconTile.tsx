import { Icon, type IconName } from "../Icon/Icon.js";
import styles from "./IconTile.module.css";

export interface IconTileProps {
  icon: IconName;
  /** sm 28 (alerta) · md 40 (disco de lista e upload) · lg 44 (estado de página) · xl 48 (estado vazio). */
  size?: "sm" | "md" | "lg" | "xl";
  /** Cor só quando o estado significa algo; `muted` é o ícone em espera. */
  tone?: "neutral" | "muted" | "success" | "warning" | "danger" | "info";
  /** cavado: papel afundado (--sf2 + --deb). folha: papel pousado (--sf3 + --sh1). */
  surface?: "cavado" | "folha";
}

/**
 * Disco de ícone (origem: Padrões, "Ícone de estado", e Campos, "Upload"): o
 * ícone mora num squircle do tamanho da metade da altura. Um encaixe só para
 * estado vazio, estado de página, cartão de navegação e lista de serviços.
 */
export function IconTile({ icon, size = "md", tone = "neutral", surface = "cavado" }: IconTileProps) {
  return <span className={styles.root} data-size={size} data-tone={tone} data-surface={surface} aria-hidden="true"><Icon name={icon} /></span>;
}
