import type { ReactNode } from "react";
import { ActionList } from "../ActionList/ActionList.js";
import { Button } from "../Button/Button.js";
import { Chip } from "../Chip/Chip.js";
import { Icon } from "../Icon/Icon.js";
import { SectionTitle } from "../SectionTitle/SectionTitle.js";
import s from "./CrmWorkspace.module.css";

export const CRM_COLORS = [{ value: "neutral", label: "Cinza" }, { value: "blue", label: "Azul" }, { value: "green", label: "Verde" }, { value: "red", label: "Vermelho" }, { value: "amber", label: "Âmbar" }, { value: "purple", label: "Roxo" }];

const CRM_INK: Readonly<Record<string, string>> = { blue: "var(--v1)", green: "var(--ok)", red: "var(--er)", amber: "var(--wa)", purple: "var(--v4)" };

/**
 * Cor de etiqueta ou etapa → tinta do ponto. A cor de CRM nunca pinta uma
 * área: vira um ponto (6–8px) ou um traço fino. Cinza é a tinta 3; azul e roxo
 * são pigmentos; verde, vermelho e âmbar falam a língua dos estados.
 */
export function crmColor(color: string | null | undefined): string {
  if (!color || color === "neutral") return "var(--tx3)";
  if (color.startsWith("#")) return color;
  return CRM_INK[color] ?? "var(--tx3)";
}

export function CrmWorkspace({ context, current, actions }: { context: ReactNode; current: ReactNode; actions: ReactNode }) {
  return <div className={s.workspace}><section className={s.context}>{context}</section><section className={s.current}>{current}</section><aside className={s.actions}>{actions}</aside></div>;
}

export function CrmSection({ title, description, children, action }: { title: string; description?: string; children: ReactNode; action?: ReactNode }) {
  return <section className={s.section}><SectionTitle level="block" description={description} actions={action}>{title}</SectionTitle>{children}</section>;
}

/** Etiqueta de CRM (etapa, etiqueta de negócio): o chip neutro, a cor só no ponto. */
export function CrmLabel({ children, color = "neutral", size = "md" }: { children: ReactNode; color?: string | null | undefined; size?: "sm" | "md" }) {
  return <Chip size={size} dot={color && color !== "neutral" ? crmColor(color) : null}>{children}</Chip>;
}

export function CrmPhase({ name, color, action, summary, title = "Fase atual", children }: { name: string; color?: string | null | undefined; count: number; action?: ReactNode; summary?: ReactNode; title?: string; children: ReactNode }) {
  return <section className={s.phase}>
    <header className={s.phaseHeader}>
      <div className={s.phaseCopy}>
        <SectionTitle level="block" actions={action}><span className={s.phaseTitle}>{title} <CrmLabel color={color ?? "blue"}>{name}</CrmLabel></span></SectionTitle>
        {summary}
      </div>
    </header>
    <div className={s.phaseBody}>{children}</div>
  </section>;
}

export interface DealStageActionsProps {
  destinations: readonly { id: string; label: string; color?: string | null | undefined; detail: string; current?: boolean }[];
  onMove: (id: string) => void;
  onWon?: (() => void) | undefined;
  onLost?: (() => void) | undefined;
  closed?: boolean;
}

/**
 * Mover o negócio: a lista de etapas (ActionList) com a atual marcada e, no
 * pé, Ganho e Perdido com espaço para o rótulo inteiro.
 */
export function DealStageActions({ destinations, onMove, onWon, onLost, closed }: DealStageActionsProps) {
  const reachable = destinations.filter((item) => !item.current);
  return <section className={s.stageActions} aria-label="Movimentar negócio">
    <SectionTitle level="block" description={closed ? "Negócio encerrado" : "Escolha a próxima etapa"}>Mover negócio</SectionTitle>
    {destinations.length > 0 && <ActionList
      label="Etapas do funil"
      items={destinations.map((item) => ({
        id: item.id,
        label: item.label,
        dot: crmColor(item.color ?? "blue"),
        ...(item.current ? { current: true, ariaLabel: `Etapa atual: ${item.label}` } : { ariaLabel: `${item.detail}: ${item.label}`, trailingIcon: item.detail === "Retornar" ? "chevronLeft" as const : "chevronRight" as const }),
      }))}
      onSelect={onMove}
    />}
    {!closed && reachable.length === 0 && <p className={s.actionEmpty}>Nenhum destino disponível nesta etapa.</p>}
    {(onWon || onLost) && <div className={s.outcomes}>
      <span className={s.outcomesLabel}>Encerrar negociação</span>
      <div className={s.outcomeButtons}>
        {onWon && <Button variant="secondary" tone="success" icon={<Icon name="check" />} onClick={onWon}>Ganho</Button>}
        {onLost && <Button variant="secondary" tone="danger" icon={<Icon name="close" />} onClick={onLost}>Perdido</Button>}
      </div>
    </div>}
  </section>;
}
