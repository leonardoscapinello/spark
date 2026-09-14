import { Icon } from "../Icon/Icon.js";
import s from "./StageProgress.module.css";

export interface StageProgressItem {
  id: string;
  label: string;
}

export interface StageProgressProps<Id extends string = string> {
  /** Etapas na ordem do funil. */
  stages: readonly StageProgressItem[];
  /** Etapa onde o registro está agora. */
  currentId: Id | null;
  /** Rótulo de apoio dentro da etapa atual — «6 dias nesta etapa». */
  currentHint?: string;
  /** Ganho/perdido encerra o funil: nenhuma etapa fica "a fazer". */
  outcome?: "won" | "lost" | undefined;
  /** Sem isto a barra é só leitura (sem permissão de mover, ou negócio fechado). */
  onSelect?: (id: string) => void;
  label?: string;
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
export function StageProgress<Id extends string = string>({ stages, currentId, currentHint, outcome, onSelect, label = "Etapas do funil" }: StageProgressProps<Id>) {
  const currentIndex = stages.findIndex((stage) => stage.id === currentId);
  const tone = outcome === "lost" ? "lost" : outcome === "won" ? "won" : "open";

  return <ol className={s.root} aria-label={label} data-tone={tone}>
    {stages.map((stage, index) => {
      const state = outcome === "won" ? "done"
        : index < currentIndex ? "done"
        : index === currentIndex ? "current"
        : "todo";
      const content = <>
        {state === "done" && <Icon name="check" className={s.check} />}
        <span className={s.label}>{stage.label}</span>
        {state === "current" && currentHint && <span className={s.hint}>· {currentHint}</span>}
      </>;
      return <li key={stage.id} className={s.step} data-state={state}>
        {onSelect
          ? <button type="button" className={s.action} aria-current={state === "current" ? "step" : undefined} onClick={() => onSelect(stage.id)}>{content}</button>
          : <span className={s.action} aria-current={state === "current" ? "step" : undefined}>{content}</span>}
      </li>;
    })}
  </ol>;
}
