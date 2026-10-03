import { useLayoutEffect, useRef, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { Button } from "../Button/Button.js";
import { Chip } from "../Chip/Chip.js";
import { Icon } from "../Icon/Icon.js";
import { SegmentedControl } from "../SegmentedControl/SegmentedControl.js";
import { inkTyping } from "../motion/inkTyping.js";
import s from "./ReplyComposer.module.css";

export type ReplyComposerMode = "reply" | "note";

const number = new Intl.NumberFormat("pt-BR");

export interface ReplyComposerProps {
  mode: ReplyComposerMode;
  onModeChange: (mode: ReplyComposerMode) => void;
  /** A caixa escolhida não responde (conversa manual): só nota. */
  replyDisabled?: boolean;
  value: string;
  onValueChange: (value: string) => void;
  onSubmit: () => void;
  /** Convite do texto e nome acessível («Responder pelo WhatsApp Vendas…»). */
  placeholder?: string;
  /** Limite de caracteres mostrado no contador. */
  maxLength?: number;
  /** Enviando: o botão carvão mostra o ensō. */
  submitting?: boolean;
  /** Pode enviar (texto, anexo ou modelo escolhido). Padrão: há texto. */
  canSubmit?: boolean;
  /** Por onde a resposta sai: menu com as caixas da pessoa (modo responder). */
  route?: ReactNode;
  /** Aviso acima do texto (fora da janela de 24 h): abre espaço em vez de surgir seco. */
  notice?: ReactNode;
  /** Substitui o texto livre (modelo aprovado fora da janela de 24 h). */
  body?: ReactNode;
  /** Ferramentas da barra, à esquerda (respostas prontas). */
  tools?: ReactNode;
  /** Com ela, o clipe aparece na barra (só no modo responder). */
  onAttach?: (files: File[]) => void;
  attachment?: { name: string; uploading?: boolean } | null;
  onRemoveAttachment?: () => void;
}

/**
 * Campo de resposta do atendimento: uma folha só (--sf3 + granulação, borda,
 * --sh1, raio 28) que se ergue enquanto se escreve. Em cima, Responder | Nota
 * no segmentado com a folha deslizante e, à direita, por onde a resposta sai.
 * O texto não tem caixa própria e cresce até 224px. Embaixo, as ferramentas
 * em tinta, o contador em mono e o carvão de enviar (⌘/Ctrl + Enter também
 * envia). Nota é só da equipe: a folha ganha um véu de aviso suave.
 */
export function ReplyComposer({ mode, onModeChange, replyDisabled = false, value, onValueChange, onSubmit, placeholder, maxLength = 20_000, submitting = false, canSubmit, route, notice, body, tools, onAttach, attachment, onRemoveAttachment }: ReplyComposerProps) {
  const text = useRef<HTMLTextAreaElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const note = mode === "note";
  const ready = (canSubmit ?? value.trim().length > 0) && value.length <= maxLength;

  useLayoutEffect(() => {
    const element = text.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${element.scrollHeight}px`;
  }, [value, mode, body]);

  function send() { if (ready && !submitting) onSubmit(); }
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); send(); }
  function shortcut(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) { event.preventDefault(); send(); }
  }

  return <form className={s.root} data-mode={mode} aria-label={note ? "Nota interna" : "Responder"} onSubmit={submit}>
    <div className={s.head}>
      <SegmentedControl size="sm" label="Tipo de mensagem" value={mode} options={[{ value: "reply", label: "Responder", disabled: replyDisabled }, { value: "note", label: "Nota" }]} onValueChange={onModeChange} />
      <div className={s.context}>{note ? <Chip tone="warning">Somente equipe</Chip> : route}</div>
    </div>
    {notice && <div className={s.notice}><div>{notice}</div></div>}
    {body ?? <textarea
      ref={text}
      className={s.text}
      rows={2}
      value={value}
      placeholder={placeholder}
      aria-label={placeholder ?? (note ? "Nota interna" : "Resposta")}
      onChange={(event) => onValueChange(event.target.value)}
      onInput={(event) => inkTyping(event.nativeEvent as InputEvent)}
      onKeyDown={shortcut}
    />}
    {attachment && <div className={s.file} aria-busy={attachment.uploading || undefined}>
      <Icon name={attachment.uploading ? "upload" : "file"} />
      <span className={s.fileName}>{attachment.uploading ? `Enviando ${attachment.name}…` : attachment.name}</span>
      {!attachment.uploading && onRemoveAttachment && <Button type="button" variant="ghost" size="sm" iconOnly icon={<Icon name="close" />} aria-label="Remover anexo" onClick={onRemoveAttachment} />}
    </div>}
    <div className={s.bar}>
      <div className={s.tools}>
        {tools}
        {onAttach && !note && <>
          <input ref={picker} type="file" hidden tabIndex={-1} aria-hidden="true" onChange={(event) => { const files = Array.from(event.target.files ?? []); event.target.value = ""; if (files.length) onAttach(files); }} />
          <Button type="button" variant="ghost" size="sm" iconOnly icon={<Icon name="clip" />} aria-label="Anexar arquivo" disabled={Boolean(attachment)} onClick={() => picker.current?.click()} />
        </>}
      </div>
      {!body && <span className={s.counter} data-over={value.length > maxLength || undefined} aria-label={`${number.format(value.length)} de ${number.format(maxLength)} caracteres`}>{number.format(value.length)}/{number.format(maxLength)}</span>}
      <Button type="submit" loading={submitting} disabled={!ready} icon={<Icon name={note ? "check" : "arrowUp"} />}>{note ? "Adicionar nota" : "Enviar"}</Button>
    </div>
  </form>;
}

/** Prévia em papel cavado (texto do modelo aprovado com as variáveis preenchidas). */
export function ReplyComposerPreview({ children }: { children: ReactNode }) {
  return <p className={s.preview}>{children}</p>;
}
