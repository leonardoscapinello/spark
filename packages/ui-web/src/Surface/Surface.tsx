import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";
import s from "./Surface.module.css";

export type SurfaceElevation = "pousada" | "erguida" | "segurada" | "cavada";
export type SurfaceRadius = "sm" | "item" | "rico" | "lista" | "md" | "bloco" | "lg" | "kpi" | "xl" | "2xl";

export type SurfaceProps<T extends ElementType = "div"> = {
  as?: T;
  /** pousada: card, tabela, seção · erguida: sidebar, coluna em destaque, hover · segurada: modal, drawer · cavada: trilho, coluna do quadro, área de soltar. */
  elevation?: SurfaceElevation | undefined;
  /** Raio da escala da identidade, sempre em squircle. Padrão: xl (44). */
  radius?: SurfaceRadius | undefined;
  /** Ergue 1px com --e2 no hover — só quando a folha inteira é clicável. */
  interactive?: boolean | undefined;
  children?: ReactNode;
  className?: string | undefined;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "children" | "className">;

/**
 * Folha (origem: "Luz & matéria"). A única forma de desenhar uma superfície:
 * papel com granulação nas quatro alturas — pousada, erguida, segurada,
 * cavada. Tela não pinta fundo, borda nem sombra; escolhe a altura (ADR-0045).
 */
export function Surface<T extends ElementType = "div">({ as, elevation = "pousada", radius = "xl", interactive = false, className, children, ...rest }: SurfaceProps<T>) {
  const Component = as ?? "div";
  return <Component className={[s.root, className].filter(Boolean).join(" ")} data-elevation={elevation} data-radius={radius} data-interactive={interactive || undefined} {...rest}>{children}</Component>;
}
