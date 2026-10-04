import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Field as BaseField } from "@base-ui/react/field";
import { Field } from "../Field/Field.js";
import { Label } from "../Label/Label.js";
import { Icon, type IconName } from "../Icon/Icon.js";
import { Spinner } from "../Spinner/Spinner.js";
import { Tooltip } from "../Tooltip/Tooltip.js";
import s from "./InlineField.module.css";

export interface InlineFieldProps {
  label: string;
  /** O que se lê quando o campo está parado. */
  value: ReactNode;
  /** Avatar de 24 (pigmento) antes do nome de um registro. */
  leading?: ReactNode;
  /** Sem valor: a mesma caixa mostra «Adicionar» em tinta 3 com o ＋. */
  empty?: boolean;
  /** Só leitura: mesma caixa, sem ação. Sem `children` o campo também é só leitura. */
  disabled?: boolean;
  /** Marca o campo como obrigatório ao lado do rótulo. */
  required?: boolean;
  /** Campo que precisa da largura toda (texto longo): o rótulo sobe e a caixa cresce. */
  block?: boolean;
  /** Área de texto: ocupa a largura toda e preserva a geometria do Textarea. */
  multiline?: boolean;
  /** Valor em mono tabular: data, dinheiro, documento, telefone. */
  numeric?: boolean;
  hint?: ReactNode;
  /** Regra sinalizada depois do nome, sem acrescentar uma segunda linha. */
  requirement?: "required" | "important" | undefined;
  /**
   * Endereço que o valor aponta. Com ele, o valor parado vira link: um clique
   * edita, dois cliques abrem.
   */
  href?: string;
  preview?: ReactNode;
  onPreviewRequest?: () => void;
  /** Descarta o rascunho antes de fechar por Escape ou pelo botão cancelar. */
  onCancel?: () => void;
  /**
   * Ação sobre o valor (abrir a ficha da pessoa, por exemplo): botão de tinta
   * que aparece no hover, na ponta direita da mesma caixa. Botão irmão do
   * valor, nunca dentro dele. Sem editor, o próprio valor abre a ação.
   */
  action?: { label: string; icon: IconName; onClick: () => void };
  /** Começa editando (histórias e telas que abrem já no campo). */
  defaultEditing?: boolean;
  /**
   * O campo de edição. Recebe `close`, que a tela chama depois de gravar —
   * um `Select` fecha ao escolher, um texto fecha ao sair do campo.
   */
  children?: (close: (persistence?: Promise<unknown>) => void, trackPersistence: (persistence: Promise<unknown>) => void) => ReactNode;
}

type PersistenceState = "idle" | "saving" | "saved" | "error";

/** Sinal da regra da etapa; não repete o estado do valor ao lado do campo. */
export function FieldRequirement({ level }: { level: "required" | "important" }) {
  const label = level === "required" ? "Campo obrigatório" : "Campo importante";
  return <Tooltip content={label} size="compact"><button type="button" className={s.requirement} data-level={level} aria-label={label}>
    <Icon name={level === "required" ? "alert" : "info"} />
  </button></Tooltip>;
}

/**
 * Linha «rótulo · valor» que vira campo no lugar (origem: Perfil §11, "linha
 * de detalhe rótulo/valor"; Campos §2). É o contrato único de valor editável
 * do produto — texto, data, dinheiro, responsável, pessoa, empresa e campos
 * personalizados passam todos por aqui:
 *
 * - **Linha:** rótulo 12 em tinta 3 numa coluna fixa (--ui-fieldLabelColumn),
 *   caixa do valor à direita; linhas separadas por um fio de 1px (--bd).
 * - **Caixa:** a MESMA nos três estados — 36 de altura, pílula, 12 de recuo,
 *   mesmo lugar. Nada pula ao trocar de estado.
 * - **Preenchido:** caixa de tinta (sem fundo, sem borda), valor 13/400 em
 *   tinta 1, avatar de 24 antes de nome de registro. No hover/foco a caixa
 *   ganha --acs e o lápis de 14 (tinta 3) aparece na ponta; a ação do registro
 *   (o olho) aparece ao lado dele.
 * - **Vazio:** a mesma caixa, «Adicionar» em tinta 3 no lugar do texto e o ＋
 *   de 14 na ponta.
 * - **Editando:** a mesma caixa vira o campo — papel cavado (--sf2 + --deb),
 *   borda --tx3 e halo de foco — e o controle (texto, data, seleção, busca de
 *   registro) ocupa o miolo. A troca é só a superfície aparecendo pela física
 *   global de 550 ms. Gravando e erro aparecem dentro da caixa; o erro ganha o
 *   anel de 1px --er e a frase abre espaço embaixo.
 *
 * **Sair do campo grava.** `Enter`, clicar fora e o botão de fechar fazem a
 * mesma coisa — tiram o foco do controle, e é o `onBlur` dele que grava.
 * `Escape` desiste. Não há passo de confirmação.
 */
export function InlineField({ label, value, leading, empty = false, disabled = false, required = false, block = false, multiline = false, numeric = false, hint, requirement, href, action, preview, onPreviewRequest, onCancel, defaultEditing = false, children }: InlineFieldProps) {
  const readOnly = disabled || children === undefined;
  const fieldRequirement = required ? "required" : requirement;
  const [open, setOpen] = useState(defaultEditing);
  const [persistenceState, setPersistenceState] = useState<PersistenceState>("idle");
  const holder = useRef<HTMLDivElement>(null);
  const row = useRef<HTMLDivElement>(null);
  const restoreFocus = useRef(false);
  const persistenceRevision = useRef(0);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editing = open && !readOnly;

  function trackPersistence(persistence: Promise<unknown>) {
    const revision = ++persistenceRevision.current;
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    setPersistenceState("saving");
    void persistence.then(
      () => {
        if (revision !== persistenceRevision.current) return;
        setPersistenceState("saved");
        feedbackTimer.current = setTimeout(() => setPersistenceState("idle"), 1_200);
      },
      () => {
        if (revision !== persistenceRevision.current) return;
        setPersistenceState("error");
        feedbackTimer.current = setTimeout(() => setPersistenceState("idle"), 3_000);
      },
    );
  }

  /** Tira o foco do controle, acompanha a gravação real e fecha. */
  function close(persistence?: Promise<unknown>) {
    if (persistence) trackPersistence(persistence);
    holder.current?.querySelector<HTMLElement>("input, textarea, select, [contenteditable='true']")?.blur();
    setOpen(false);
  }

  /** Cancela sem tirar o foco primeiro: `blur` é o gesto de salvar. */
  function cancel() {
    onCancel?.();
    restoreFocus.current = true;
    setOpen(false);
  }

  useEffect(() => () => {
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
  }, []);

  /* O controle acabou de substituir o valor: o foco vai junto. E quando o
   * controle é um GATILHO — calendário, seleção — ele abre sozinho: sem isso
   * são dois cliques para uma ação só. Campo de digitar só recebe o foco. */
  useEffect(() => {
    if (!editing) return;
    const control = holder.current?.querySelector<HTMLElement>("input, select, textarea, button:not([data-inline-cancel]), [tabindex]");
    if (!control) return;
    control.focus();
    if (control.tagName === "BUTTON" || control.getAttribute("aria-haspopup") !== null) control.click();
  }, [editing]);

  /* Clicar fora fecha, e fechar grava. `pointerdown` e não `click`: o clique
   * num item de menu suspenso chega depois de o menu sair do documento. */
  useEffect(() => {
    if (!editing) return;
    function onPointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (row.current?.contains(target)) return;
      // Menu e calendário são desenhados fora da linha, num portal.
      if (target instanceof Element && target.closest("[role='dialog'], [role='listbox'], [role='menu'], [data-inline-editor]")) return;
      close();
    }
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [editing]);

  /* Rótulo em UMA linha, cortado com reticências; a dica mostra o inteiro. */
  const labelContent = readOnly && (!action || disabled)
    ? <span className={s.label}>{label}</span>
    : <Label className={s.label} onPointerDown={(event) => { if (editing) event.preventDefault(); }}>{label}</Label>;
  const rotulo = <span className={s.labelColumn}>
    <span className={s.labelRow}>
      {block || multiline ? labelContent : <Tooltip content={label} pinOnClick={false} size="compact">{labelContent}</Tooltip>}
      {fieldRequirement && <FieldRequirement level={fieldRequirement} />}
    </span>
    {hint && <small className={s.hint}>{hint}</small>}
  </span>;

  const shown = empty && !readOnly ? "Adicionar" : value;
  const text = <span className={s.text} data-numeric={numeric && !empty ? "" : undefined}>{shown}</span>;
  const content = leading && !empty ? <>{<span className={s.leading}>{leading}</span>}{text}</> : text;

  let body: ReactNode;
  if (editing) {
    body = <>
      <div className={s.editor}>{children!(close, trackPersistence)}</div>
      <PersistenceFeedback state={persistenceState} label={label} />
      <button type="button" data-inline-cancel="" className={s.iconButton} aria-label={`Cancelar alteração em ${label}`} onPointerDown={(event) => event.preventDefault()} onClick={cancel}>
        <Icon name="close" />
      </button>
    </>;
  } else if (readOnly && action && !disabled) {
    body = <BaseField.Control render={<button type="button" />} className={s.value} title={textOf(value)} aria-labelledby={undefined} aria-label={action.label} onClick={action.onClick}>{content}<span className={s.mark} data-action aria-hidden="true"><Icon name={action.icon} /></span></BaseField.Control>;
  } else if (readOnly) {
    body = <><span className={s.value} title={textOf(value)}>{content}</span><PersistenceFeedback state={persistenceState} label={label} /></>;
  } else {
    const valueButton = (
      <BaseField.Control
        render={<button type="button" />}
        className={s.value}
        title={textOf(value)}
        ref={(node) => { if (node && restoreFocus.current) { restoreFocus.current = false; node.focus(); } }}
        aria-labelledby={undefined}
        aria-label={`Alterar ${label}. Valor atual: ${empty ? "vazio" : textOf(value)}${href ? ". Dois cliques abrem o endereço." : ""}`}
        onClick={() => setOpen(true)}
        onDoubleClick={() => {
          if (href === undefined) return;
          setOpen(false);
          window.open(href, "_blank", "noopener,noreferrer");
        }}
      >
        {content}
        <span className={s.mark} aria-hidden="true"><Icon name={empty ? "plus" : href === undefined ? "pencil" : "link"} /></span>
      </BaseField.Control>
    );
    body = <>
      {preview ? <Tooltip content={preview} appearance="surface" pinOnClick={false} {...(onPreviewRequest ? { onOpen: onPreviewRequest } : {})}>{valueButton}</Tooltip> : valueButton}
      {action && !empty && <button type="button" className={`${s.iconButton} ${s.action}`} aria-label={action.label} onClick={action.onClick}><Icon name={action.icon} /></button>}
      <PersistenceFeedback state={persistenceState} label={label} />
    </>;
  }

  return (
    <Field className={s.field} disabled={disabled} data-block={block || multiline || undefined} data-multiline={multiline || undefined} data-requirement={fieldRequirement}>
      <div ref={row} className={s.row}>
        {rotulo}
        <div className={s.control}>
          <div
            ref={holder}
            className={s.box}
            data-state={editing ? "editing" : "display"}
            data-empty={empty && !editing ? "" : undefined}
            data-readonly={readOnly && (!action || disabled) ? "" : undefined}
            data-link={href !== undefined && !empty ? "" : undefined}
            data-persistence={persistenceState === "idle" ? undefined : persistenceState}
            onKeyDown={editing ? (event) => {
              if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); cancel(); return; }
              if (event.key !== "Enter") return;
              const alvo = event.target;
              if (!(alvo instanceof HTMLElement)) return;
              /* Enter grava: tira o foco, e sair do campo é o gesto que grava.
               * Em texto longo, Enter é quebra de linha: grava com Ctrl/Cmd+Enter. */
              const multilinha = alvo.tagName === "TEXTAREA";
              if (multilinha && !(event.metaKey || event.ctrlKey)) return;
              event.preventDefault();
              restoreFocus.current = true;
              alvo.blur();
            } : undefined}
          >{body}</div>
          {/* Erro de gravação: a frase abre espaço embaixo da caixa. O anúncio
            * fica com o status da caixa; aqui é só a leitura. */}
          <div data-collapse="" data-open={persistenceState === "error" ? "true" : "false"} className={s.errorSlot} style={{ "--g": "var(--space-1)" } as CSSProperties}>
            <div><span className={s.error} aria-hidden="true">Não foi possível salvar. Tente de novo.</span></div>
          </div>
        </div>
      </div>
    </Field>
  );
}

function PersistenceFeedback({ state, label }: { state: PersistenceState; label: string }) {
  if (state === "idle") return null;
  const text = state === "saving" ? `Salvando ${label}` : state === "saved" ? `${label} salvo` : `Falha ao salvar ${label}`;
  return <span className={s.persistence} data-state={state} role="status" aria-label={text} title={text}>
    {state === "saving" ? <Spinner size="sm" /> : <Icon name={state === "saved" ? "check" : "close"} />}
  </span>;
}

/** O rótulo acessível precisa de texto; um nó React vira o que dá. */
function textOf(value: ReactNode): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "vazio";
}
