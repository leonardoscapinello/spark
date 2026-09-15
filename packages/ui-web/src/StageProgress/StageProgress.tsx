import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { Button } from "../Button/Button.js";
import { Icon } from "../Icon/Icon.js";
import { Popover, PopoverContent, PopoverTrigger } from "../Popover/Popover.js";
import { Tooltip } from "../Tooltip/Tooltip.js";
import s from "./StageProgress.module.css";

export interface StageProgressItem {
  id: string;
  label: string;
  locked?: boolean;
  lockReason?: string;
}

export interface StageProgressProps<Id extends string = string> {
  /** Etapas na ordem do funil. */
  stages: readonly StageProgressItem[];
  /** Etapa onde o registro está agora. */
  currentId: Id | null;
  /** Tempo que o registro passou em cada etapa, por id — «3 dias», «5 h».
   * A etapa atual mostra o tempo corrente; as vencidas, o que levaram. */
  durations?: Readonly<Record<string, string>>;
  /** Texto completo para hover/foco/toque: tempo acumulado e período atual. */
  details?: Readonly<Record<string, { duration: string; totalDuration?: string; period?: string; passages?: readonly StagePassageDetail[] }>>;
  /** Ganho/perdido encerra o funil: nenhuma etapa fica "a fazer". */
  outcome?: "won" | "lost" | undefined;
  /** Sem isto a barra é só leitura (sem permissão de mover, ou negócio fechado). */
  onSelect?: (id: string) => void;
  /** Desktop confirma no popover ancorado; mobile usa onSelect para delegar à modal. */
  onMove?: (id: string) => void | Promise<void>;
  interaction?: "popover" | "modal";
  label?: string;
  cooldownRemainingMs?: number;
}

export interface StagePassageDetail {
  duration: string;
  period: string;
  current: boolean;
  arrival: { direction: "forward" | "backward" | "created"; label: string };
  departure?: { direction: "forward" | "backward"; label: string };
}

export function StagePassageHistory({ passages, limit }: { passages: readonly StagePassageDetail[]; limit?: number }) {
  const visiblePassages = limit === undefined ? passages : passages.slice(0, limit);
  return <ol className={s.passages}>{visiblePassages.map((passage, passageIndex) => <li key={`${passage.period}-${passageIndex}`}>
    <div className={s.passageMeta}><strong>{passage.duration}</strong><span>{passage.period}</span></div>
    <ol className={s.transitions}>
      <li>
        <span className={s.directionIcon} data-direction={passage.arrival.direction}><Icon name="right" /></span>
        <div><small>Entrada</small><strong>{passage.arrival.label}</strong></div>
      </li>
      {passage.departure && <li>
        <span className={s.directionIcon} data-direction={passage.departure.direction}><Icon name="right" /></span>
        <div><small>Saída</small><strong>{passage.departure.label}</strong></div>
      </li>}
    </ol>
  </li>)}</ol>;
}

/**
 * Trilha de etapas do funil, como a do Pipedrive (docs/inspiration/pipedrive,
 * captura 001): uma faixa de 24px dividida em setas — as vencidas preenchidas,
 * a atual em destaque com o tempo parado nela, as seguintes apagadas. Cada
 * seta é um botão: mover o negócio é um clique na etapa, sem abrir menu.
 *
 * Só desenha e avisa quem clicou. Quem decide se pode mover, e o que fazer
 * com isso, é a tela (ADR-0020).
 */
export function StageProgress<Id extends string = string>({ stages, currentId, durations, details, outcome, onSelect, onMove, interaction = "popover", label = "Etapas do funil", cooldownRemainingMs = 0 }: StageProgressProps<Id>) {
  const currentStep = useRef<HTMLElement>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const currentIndex = stages.findIndex((stage) => stage.id === currentId);
  const tone = outcome === "lost" ? "lost" : outcome === "won" ? "won" : "open";
  useEffect(() => { if (typeof currentStep.current?.scrollIntoView === "function") currentStep.current.scrollIntoView({ block: "nearest", inline: "nearest" }); }, [currentId]);

  return <div className={s.frame}>
    {cooldownRemainingMs > 0 && <div className={s.cooldown} role="status"><span>Aguarde {Math.ceil(cooldownRemainingMs / 1_000)} s para mover novamente</span><i style={{ "--cooldown-progress": `${Math.min(100, cooldownRemainingMs / 30)}%` } as CSSProperties} /></div>}
    <ol className={s.root} aria-label={label} data-tone={tone} aria-disabled={cooldownRemainingMs > 0 || undefined}>
    {stages.map((stage, index) => {
      const state = outcome === "won" ? "done"
        : index < currentIndex ? "done"
        : index === currentIndex ? "current"
        : "todo";
      const duration = durations?.[stage.id];
      const content = <>
        <span className={s.label}>{stage.locked && <Icon name="lock" />}{stage.label}</span>
        {duration && state !== "todo" && <span className={s.hint}>{duration}</span>}
      </>;
      const interactive = Boolean(onSelect || onMove) && cooldownRemainingMs <= 0;
      const action = interactive
          ? <button ref={state === "current" ? (node) => { currentStep.current = node; } : undefined} type="button" className={s.action} aria-current={state === "current" ? "step" : undefined} onClick={() => onSelect?.(stage.id)}>{content}</button>
          : <span ref={state === "current" ? (node) => { currentStep.current = node; } : undefined} className={s.action} aria-current={state === "current" ? "step" : undefined}>{content}</span>;
      const detail = details?.[stage.id];
      return <li key={stage.id} className={s.step} data-state={state}>
        {interactive && interaction === "popover" ? <Popover open={openId === stage.id} onOpenChange={(open) => { setError(null); setExpandedId(null); setOpenId(open ? stage.id : null); }}>
          <PopoverTrigger render={<button ref={state === "current" ? (node) => { currentStep.current = node; } : undefined} type="button" className={s.action} aria-current={state === "current" ? "step" : undefined}>{content}</button>} />
          <PopoverContent title={stage.label} className={s.stagePopover} {...(s.stagePopoverContent ? { contentClassName: s.stagePopoverContent } : {})}>
            <div className={s.summary}>
              <span>{state === "current" ? "Tempo nesta passagem" : state === "done" ? "Tempo na última passagem" : "Ainda não percorrida"}</span>
              <strong>{detail?.duration ?? "Sem tempo registrado"}</strong>
              {detail?.totalDuration && detail.totalDuration !== detail.duration && <small>Acumulado na etapa: {detail.totalDuration}</small>}
            </div>
            {stage.locked && <p className={s.lockReason}><Icon name="lock" />{stage.lockReason ?? "Movimentação não permitida a partir da etapa atual."}</p>}
            {detail?.passages?.length ? <StagePassageHistory passages={detail.passages} {...(expandedId === stage.id ? {} : { limit: 3 })} /> : null}
            {detail?.passages && detail.passages.length > 3 && <Button variant="ghost" size="sm" onClick={() => setExpandedId((current) => current === stage.id ? null : stage.id)}>{expandedId === stage.id ? "Mostrar menos" : `Ver histórico completo (${detail.passages.length})`}</Button>}
            {error && <p className={s.error} role="alert">{error}</p>}
            {onMove && state !== "current" && !stage.locked && <Button loading={pendingId === stage.id} onClick={() => { setPendingId(stage.id); setError(null); Promise.resolve(onMove(stage.id)).then(() => setOpenId(null)).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Não foi possível mudar a etapa.")).finally(() => setPendingId(null)); }}>Mudar para esta etapa</Button>}
          </PopoverContent>
        </Popover> : interactive ? action : <Tooltip pinOnClick={false} appearance="surface" side="bottom" content={<div className={s.tooltip}>
          <strong>{stage.label}</strong>
          <span>{state === "current" ? "Etapa atual" : state === "done" ? "Etapa percorrida" : "Ainda não percorrida"}</span>
          {detail ? <><b>{detail.duration}</b>{detail.period && <span>{detail.period}</span>}</> : <span>Sem tempo registrado</span>}
        </div>}>{action}</Tooltip>}
      </li>;
    })}
    </ol>
  </div>;
}
