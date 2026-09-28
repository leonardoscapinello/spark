import type { ReactNode } from "react";
import { Button } from "../Button/Button.js";
import { Icon } from "../Icon/Icon.js";
import s from "./CrmWorkspace.module.css";
export const CRM_COLORS = [{ value: "neutral", label: "Cinza" }, { value: "blue", label: "Azul" }, { value: "green", label: "Verde" }, { value: "red", label: "Vermelho" }, { value: "amber", label: "Âmbar" }, { value: "purple", label: "Roxo" }];
export function CrmWorkspace({ context, current, actions }: { context: ReactNode; current: ReactNode; actions: ReactNode }) {
  return <div className={s.workspace}><section className={s.context}>{context}</section><section className={s.current}>{current}</section><aside className={s.actions}>{actions}</aside></div>;
}
export function CrmSection({ title, description, children, action }: { title: string; description?: string; children: ReactNode; action?: ReactNode }) {
  return <section className={s.section}><header><div><h3>{title}</h3>{description && <p>{description}</p>}</div>{action}</header>{children}</section>;
}
export function CrmLabel({ children, color = "neutral" }: { children: ReactNode; color?: string | null | undefined }) {
  return <span className={s.label} data-color={color}>{children}</span>;
}


export function CrmPhase({ name, color, count, action, children }: { name: string; color?: string | null | undefined; count: number; action?: ReactNode; children: ReactNode }) {
  return <section className={s.phase} data-color={color ?? "blue"}>
    <header className={s.phaseHeader}><div><h2>Fase atual <CrmLabel color={color === "neutral" ? "blue" : color ?? "blue"}>{name}</CrmLabel></h2><p>{count === 0 ? "Nenhum campo solicitado" : `${count} ${count === 1 ? "campo nesta etapa" : "campos nesta etapa"}`}</p></div>{action}</header>
    <div className={s.phaseBody}>{children}</div>
  </section>;
}

export interface DealStageActionsProps {
  destinations: readonly { id: string; label: string; color?: string | null | undefined; detail: string }[];
  onMove: (id: string) => void;
  onWon?: (() => void) | undefined;
  onLost?: (() => void) | undefined;
  closed?: boolean;
}
export function DealStageActions({ destinations, onMove, onWon, onLost, closed }: DealStageActionsProps) {
  return <section className={s.stageActions} aria-label="Movimentar negócio">
    <header><h3>Mover negócio</h3><p>{closed ? "Negócio encerrado" : "Escolha a próxima etapa"}</p></header>
    <div className={s.stageList}>{destinations.map((item) => <Button key={item.id} variant="ghost" shape="rounded" className={s.destination} data-color={item.color ?? "blue"} onClick={() => onMove(item.id)}><span className={s.stageDot} /><span className={s.destinationText}>{item.label}{item.detail === "Retornar" && <small>Retornar</small>}</span><Icon name="right" /></Button>)}</div>
    {!closed && destinations.length === 0 && <p className={s.actionEmpty}>Nenhum destino disponível nesta etapa.</p>}
    {(onWon || onLost) && <div className={s.outcomes}><span>Encerrar negociação</span>{onWon && <Button variant="ghost" shape="rounded" className={s.outcome} data-outcome="won" icon={<Icon name="check" />} onClick={onWon}>Ganho</Button>}{onLost && <Button variant="ghost" shape="rounded" className={s.outcome} data-outcome="lost" icon={<Icon name="close" />} onClick={onLost}>Perdido</Button>}</div>}
  </section>;
}
