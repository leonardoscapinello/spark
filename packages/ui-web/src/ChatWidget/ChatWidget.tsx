import type { CSSProperties, FormEvent, ReactNode } from "react";
import { Button } from "../Button/Button.js";
import { Icon } from "../Icon/Icon.js";
import { inkTyping } from "../motion/inkTyping.js";
import s from "./ChatWidget.module.css";

/** A cor da marca do cliente entra como dado (config do widget), nunca como estilo da tela. */
function brandStyle(brand: string): CSSProperties {
  return { "--marca": brand } as CSSProperties;
}

/** Bolha do widget no site do cliente: círculo na cor da marca, ícone de conversa. */
export function ChatLauncher({ brand, onOpen, label = "Abrir chat" }: { brand: string; onOpen: () => void; label?: string }) {
  return <button type="button" className={s.launcher} data-press="ink" style={brandStyle(brand)} aria-label={label} onClick={onOpen}><Icon name="message" /></button>;
}

export interface ChatWindowProps {
  /** Nome da empresa no cabeçalho. */
  title: string;
  subtitle?: string;
  /** Cor da marca do cliente (#rrggbb): marca do cabeçalho e bolhas do visitante. */
  brand: string;
  onClose: () => void;
  /** O histórico (ChatThread com MessageBubble). */
  children: ReactNode;
  /** O campo de mensagem (ChatInput). */
  footer: ReactNode;
}

/**
 * Janela do chat do site (origem: Chat — atendimento, §17): folha segurada
 * que sobe ao abrir, cabeçalho com a marca do cliente em squircle, histórico
 * e o campo em pílula cavada no rodapé.
 */
export function ChatWindow({ title, subtitle, brand, onClose, children, footer }: ChatWindowProps) {
  return <section className={s.window} aria-label={title} style={brandStyle(brand)}>
    <header className={s.header}>
      <span className={s.mark} aria-hidden="true"><Icon name="message" /></span>
      <div className={s.identity}>
        <h2 className={s.title}>{title}</h2>
        {subtitle && <p className={s.subtitle}>{subtitle}</p>}
      </div>
      <Button type="button" variant="ghost" size="sm" iconOnly icon={<Icon name="close" />} aria-label="Fechar chat" onClick={onClose} />
    </header>
    {children}
    <div className={s.footer}>{footer}</div>
  </section>;
}

export interface ChatInputProps {
  value: string;
  onValueChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  label?: string;
  sending?: boolean;
}

/** Campo do chat (§17, «composer»): pílula cavada de 48 com o texto e o envio de 36. Enter envia. */
export function ChatInput({ value, onValueChange, onSubmit, placeholder = "Escreva uma mensagem…", label = "Escrever mensagem", sending = false }: ChatInputProps) {
  const ready = value.trim().length > 0 && !sending;
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (ready) onSubmit();
  }
  return <form className={s.input} onSubmit={submit}>
    <input className={s.field} aria-label={label} placeholder={placeholder} value={value} autoComplete="off" onChange={(event) => onValueChange(event.target.value)} onInput={(event) => inkTyping(event.nativeEvent as InputEvent)} />
    <button type="submit" className={s.send} data-press="ink" aria-label="Enviar" aria-busy={sending || undefined} disabled={!ready}><Icon name="arrowUp" /></button>
  </form>;
}
