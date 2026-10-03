import { createElement, type ComponentProps } from "react";
import { glyphs } from "./glyphs.js";
import styles from "./Icon.module.css";

export type IconName = keyof typeof glyphs;

/**
 * Ícone da identidade (ADR-0044): viewBox 24, traço 1.5, pontas redondas. O
 * tamanho vem de quem envolve (--icon, padrão 16). pathLength=100 em cada
 * traço deixa o desenho ser refeito no hover ([data-ai], src/identidade.css).
 */
export function Icon({ name, className, ...props }: { name: IconName } & Omit<ComponentProps<"svg">, "children">) {
  return <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    data-icon=""
    className={className ? `${styles.root} ${className}` : styles.root}
    {...props}
  >
    {glyphs[name].map(([tag, attrs], index) => createElement(tag, { key: index, ...attrs, pathLength: 100 }))}
  </svg>;
}
