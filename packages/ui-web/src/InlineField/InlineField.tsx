import { useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "../Icon/Icon.js";
import s from "./InlineField.module.css";

export interface InlineFieldProps {
  label: string;
  /** O que se lê quando o campo está parado. */
  value: ReactNode;
  /** Sem valor: o texto sai apagado e o leitor de tela ouve «vazio». */
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
 * nada, e o foco tem de ir para o controle — senão quem usa teclado clica e
 * fica sem saber onde caiu.
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

  return (
    <div className={s.field}>
      <div className={s.row}>
        <span className={s.label} id={`${label}-rotulo`}>{label}</span>
        <div className={s.control} ref={holder}>
          {open && !disabled
            ? children(() => setOpen(false))
            : <button
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
              </button>}
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
