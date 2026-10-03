import type { ReactNode } from "react";
import styles from "./Text.module.css";

export interface TextProps {
  as?: "span" | "p" | "div" | "strong" | "small" | "code" | "dt" | "dd";
  /** corpo-l 14 · corpo 13 (padrão) · pequeno 12 · legenda 11 — a escala da identidade. */
  size?: "corpo-l" | "corpo" | "pequeno" | "legenda";
  /** default: tinta · secondary: tinta 2 (texto de apoio) · muted: tinta 3 (metadado) · estados só quando significam. */
  tone?: "default" | "secondary" | "muted" | "success" | "warning" | "danger";
  weight?: "regular" | "medium";
  /** Números, códigos e chaves: Geist Mono tabular. */
  mono?: boolean;
  /** Uma linha, corta com reticências. */
  truncate?: boolean;
  /** Até N linhas, depois reticências. */
  lines?: 2 | 3;
  id?: string | undefined;
  title?: string | undefined;
  /** Só layout (ADR-0045): a aparência é deste componente. */
  className?: string | undefined;
  children?: ReactNode;
}

/**
 * Texto da identidade (origem: Tipografia). A tela escolhe o papel — corpo,
 * apoio, metadado, número — e nunca tamanho, peso ou cor (ADR-0045). Tinta 4
 * fica de fora de propósito: é só para desabilitado.
 */
export function Text({ as: Element = "span", size = "corpo", tone = "default", weight = "regular", mono = false, truncate = false, lines, id, title, className, children }: TextProps) {
  return <Element
    id={id}
    title={title}
    className={[styles.root, className].filter(Boolean).join(" ")}
    data-size={size}
    data-tone={tone}
    data-weight={weight}
    data-mono={mono || undefined}
    data-truncate={truncate || undefined}
    data-lines={lines}
  >{children}</Element>;
}
