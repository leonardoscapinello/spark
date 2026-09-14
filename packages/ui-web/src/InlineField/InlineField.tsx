import { useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "../Icon/Icon.js";
import s from "./InlineField.module.css";

export interface InlineFieldProps {
  label: string;
  /** O que se lê quando o campo está parado. */
  value: ReactNode;
  /** Sem valor: o texto sai apagado e convida a preencher. */
  empty?: boolean;
  /** Só leitura: continua legível, deixa de ser clicável. */
  disabled?: boolean;
  /**
   * O campo de edição. Recebe `close`, que a tela chama depois de gravar —
   * um `Select` fecha ao escolher, um texto fecha ao sair do campo.
   */
  children: (close: () => void) => ReactNode;
}

/**
 * Campo que vira campo ao clicar (Pipedrive: responsável, situação e previsão
 * mudam no lugar, sem formulário).
 *
 * O que ele resolve, e por isso vive aqui e não numa tela: o valor parado tem
 * de parecer texto, o controle tem de aparecer no mesmo lugar sem empurrar
 * nada, o foco tem de ir para o controle — senão quem usa teclado clica e fica
 * sem saber onde caiu — e **desistir tem de ser tão fácil quanto começar**,
 * porque clicar no campo errado é o erro mais comum de uma coluna com dez
 * campos empilhados.
 *
 * Desistir tem três saídas, e todas fecham sem gravar: `Esc`, clicar fora, e o
 * botão de fechar ao lado do campo.
 */
export function InlineField({ label, value, empty = false, disabled = false, children }: InlineFieldProps) {
  const [open, setOpen] = useState(false);
  const holder = useRef<HTMLDivElement>(null);

  // O controle acabou de substituir um botão: sem levar o foco junto, quem
  // navega por teclado perde o lugar na tela.
  useEffect(() => {
    if (!open) return;
    const focusable = holder.current?.querySelector<HTMLElement>("input, select, textarea, button, [tabindex]");
    focusable?.focus();
  }, [open]);

  /* Clicar fora desiste. `pointerdown` e não `click`: o clique num item de
   * menu suspenso chega depois de o menu já ter sumido do documento, e a
   * verificação de «está dentro?» daria falso — fecharia antes de escolher. */
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (holder.current?.contains(target)) return;
      // Menu e calendário são desenhados fora da linha, num portal: o que sai
      // deles ainda é «dentro» da edição.
      if (target instanceof Element && target.closest("[role='dialog'], [role='listbox'], [role='menu']")) return;
      setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [open]);

  if (!open || disabled) {
    return (
      <div className={s.field}>
        <div className={s.row}>
          <span className={s.label}>{label}</span>
          <div className={s.control}>
            <button
              type="button"
              className={s.value}
              data-empty={empty}
              data-disabled={disabled}
              aria-label={disabled ? `${label}: ${textOf(value)}` : `Alterar ${label}. Valor atual: ${textOf(value)}`}
              disabled={disabled}
              onClick={() => setOpen(true)}
            >
              <span>{value}</span>
              {!disabled && <span className={s.pencil} aria-hidden="true"><Icon name="pencil" /></span>}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={s.field}>
      <div className={s.row}>
        <span className={s.label}>{label}</span>
        <div
          className={s.control}
          ref={holder}
          onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); setOpen(false); } }}
        >
          <div className={s.editing}>
            <div className={s.editor}>{children(() => setOpen(false))}</div>
            <button type="button" className={s.cancel} aria-label={`Cancelar edição de ${label}`} onClick={() => setOpen(false)}>
              <Icon name="close" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** O rótulo acessível precisa de texto; um nó React vira o que dá. */
function textOf(value: ReactNode): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "vazio";
}
