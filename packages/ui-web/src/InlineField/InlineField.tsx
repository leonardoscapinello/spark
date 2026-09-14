import { useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "../Icon/Icon.js";
import { Tooltip } from "../Tooltip/Tooltip.js";
import s from "./InlineField.module.css";

export interface InlineFieldProps {
  label: string;
  /** O que se lê quando o campo está parado. */
  value: ReactNode;
  /** Sem valor: o texto sai apagado e convida a preencher. */
  empty?: boolean;
  /** Só leitura: continua legível, deixa de ser clicável. */
  disabled?: boolean;
  /** Marca o campo como obrigatório ao lado do rótulo. */
  required?: boolean;
  /** Campo que precisa da largura toda: o controle desce para baixo do rótulo. */
  block?: boolean;
  /**
   * Endereço que o valor aponta. Com ele, o valor parado vira link: um clique
   * edita, dois cliques abrem. Quem só quer ver para onde vai não precisa
   * entrar em modo de edição para descobrir.
   */
  href?: string;
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
 * botão de fechar ao lado do campo. Gravar tem duas: sair do campo e `Enter`
 * (`Ctrl`/`Cmd`+`Enter` no texto longo, onde `Enter` é quebra de linha).
 */
export function InlineField({ label, value, empty = false, disabled = false, required = false, block = false, href, children }: InlineFieldProps) {
  const [open, setOpen] = useState(false);
  const holder = useRef<HTMLDivElement>(null);

  /* O controle acabou de substituir um botão: sem levar o foco junto, quem
   * navega por teclado perde o lugar na tela.
   *
   * E quando o controle é um GATILHO — calendário, seleção, busca — ele abre
   * sozinho. Sem isso são dois cliques para uma ação só: o primeiro troca o
   * texto pelo botão, o segundo abre o calendário. Num painel com dez campos
   * isso é o dobro de cliques o dia inteiro.
   *
   * Campo de digitar (`input`, `textarea`) só recebe o foco: abrir não
   * significa nada ali, e o cursor já está no lugar certo. */
  useEffect(() => {
    if (!open) return;
    const control = holder.current?.querySelector<HTMLElement>("input, select, textarea, button, [tabindex]");
    if (!control) return;
    control.focus();
    if (control.tagName === "BUTTON" || control.getAttribute("aria-haspopup") !== null) control.click();
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

  /* Rótulo em UMA linha, cortado com reticências, e a dica mostra o inteiro.
   *
   * «Orçamento do cliente» quebrava em duas linhas e desalinhava a coluna toda,
   * e um painel com dez campos ficava com altura irregular. Cortar mantém o
   * ritmo; a dica devolve o que foi cortado sem custar um clique. */
  const rotulo = (
    <Tooltip content={label} pinOnClick={false} size="compact">
      <span className={s.label}>{label}{required && <span className={s.required} aria-label="obrigatório">*</span>}</span>
    </Tooltip>
  );

  if (!open || disabled) {
    return (
      <div className={s.field}>
        <div className={s.row} data-block={block}>
          {rotulo}
          <div className={s.control}>
            <button
              type="button"
              className={s.value}
              data-empty={empty}
              data-disabled={disabled}
              data-link={href !== undefined}
              aria-label={disabled ? `${label}: ${textOf(value)}` : `Alterar ${label}. Valor atual: ${textOf(value)}${href ? ". Dois cliques abrem o endereço." : ""}`}
              disabled={disabled}
              onClick={() => setOpen(true)}
              onDoubleClick={() => {
                if (href === undefined) return;
                // Abrir ganha do editar: quem clicou duas vezes queria o destino.
                setOpen(false);
                window.open(href, "_blank", "noopener,noreferrer");
              }}
            >
              <span>{value}</span>
              {!disabled && <span className={s.pencil} aria-hidden="true"><Icon name={href === undefined ? "pencil" : "link"} /></span>}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={s.field}>
      <div className={s.row} data-block={block}>
        {rotulo}
        <div
          className={s.control}
          ref={holder}
          onKeyDown={(event) => {
            if (event.key === "Escape") { event.stopPropagation(); setOpen(false); return; }
            if (event.key !== "Enter") return;
            const alvo = event.target;
            if (!(alvo instanceof HTMLElement)) return;
            /* Enter grava. Em vez de um botão «confirmar» por linha — que é o
             * que tinha antes e comia metade da largura do painel — o Enter
             * tira o foco, e sair do campo já é o gesto que grava. Uma regra
             * só para teclado e mouse.
             *
             * Em texto longo, Enter é quebra de linha: ali grava com
             * Ctrl/Cmd+Enter, que é a convenção de todo campo multilinha. */
            const multilinha = alvo.tagName === "TEXTAREA";
            if (multilinha && !(event.metaKey || event.ctrlKey)) return;
            event.preventDefault();
            alvo.blur();
          }}
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
