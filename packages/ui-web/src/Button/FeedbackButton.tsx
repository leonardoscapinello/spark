import { Button, type ButtonProps } from "./Button.js";
import { Icon } from "../Icon/Icon.js";
import s from "./FeedbackButton.module.css";

export type FeedbackState = "idle" | "pending" | "success" | "error";
export type FeedbackButtonProps = Omit<ButtonProps, "children" | "loading" | "icon" | "trailingIcon" | "iconOnly"> & {
  state: FeedbackState;
  labels?: Partial<Record<FeedbackState, string>>;
};

const defaults: Record<FeedbackState, string> = { idle: "Salvar", pending: "Salvando…", success: "Salvo", error: "Tentar novamente" };

/**
 * Botão que conta o resultado da própria ação (origem: receitas, "Carregando").
 * É o Button, não outro desenho: o rótulo troca e a largura escoa, o ensō
 * gira no encaixe do ícone enquanto espera, e o ✓ ou o alerta ficam no mesmo
 * encaixe depois. Erro vira shu e pede "Tentar novamente". O chamador
 * controla o estado com o resultado real da operação.
 */
export function FeedbackButton({ state, labels, tone, ...props }: FeedbackButtonProps) {
  const text = { ...defaults, ...labels };
  const icon = state === "success" ? <Icon name="check" /> : state === "error" ? <Icon name="alert" /> : undefined;
  return (
    <>
      <Button {...props} tone={state === "error" ? "danger" : tone} loading={state === "pending"} icon={icon} data-feedback={state}>{text[state]}</Button>
      <span role="status" aria-live="polite" aria-atomic="true" className={s.announcement}>
        {state === "idle" || state === "pending" ? "" : state === "error" ? `Não foi possível salvar. ${text.error}` : text.success}
      </span>
    </>
  );
}
