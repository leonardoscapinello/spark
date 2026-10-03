import type { CSSProperties } from "react";
import styles from "./ThemePreview.module.css";

export interface ThemePreviewColors {
  accent: string;
  accentStrong: string;
  ground: string;
  surface: string;
  ink: string;
  muted: string;
  line: string;
}

export interface ThemePreviewProps {
  colors: ThemePreviewColors;
  /** Pilhas de fonte já resolvidas (ex.: fontStackFor do app). */
  fontBody: string;
  fontDisplay: string;
}

/**
 * Prévia da aparência da organização: um recorte do produto pintado com as
 * cores e fontes em rascunho. As cores vêm do dado (o que a pessoa escolheu),
 * por isso entram por variável; o desenho é o da identidade.
 */
export function ThemePreview({ colors, fontBody, fontDisplay }: ThemePreviewProps) {
  const vars = { "--p-accent": colors.accent, "--p-strong": colors.accentStrong, "--p-ground": colors.ground, "--p-surface": colors.surface, "--p-ink": colors.ink, "--p-muted": colors.muted, "--p-line": colors.line, "--p-font": fontBody, "--p-display": fontDisplay } as CSSProperties;
  return <aside className={styles.root} aria-label="Prévia da aparência">
    <div className={styles.header}><span>Prévia</span><span className={styles.live} aria-hidden="true" /></div>
    <div className={styles.canvas} style={vars}>
      <div className={styles.top}><span className={styles.logo}>spark</span><span className={styles.avatar} aria-hidden="true">LS</span></div>
      <div className={styles.body}>
        <span className={styles.eyebrow}>Negócios</span>
        <span className={styles.title}>Pipeline comercial</span>
        <span className={styles.lead}>Uma prévia rápida da identidade no dia a dia.</span>
        <div className={styles.card}><span className={styles.chip}>Em aberto</span><span className={styles.cardTitle}>Implantação assistida</span><span className={styles.value}>R$ 3.200,00</span><span className={styles.progress}><span /></span></div>
        <span className={styles.action}>Adicionar negócio</span>
      </div>
    </div>
  </aside>;
}
