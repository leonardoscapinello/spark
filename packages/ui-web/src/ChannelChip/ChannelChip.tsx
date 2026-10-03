import type { ConversationChannel, IdentityChannel } from "@spark/core";
import { Icon, type IconName } from "../Icon/Icon.js";
import s from "./ChannelChip.module.css";

export type ChannelKind = ConversationChannel | IdentityChannel;

const GLYPHS: Readonly<Record<ChannelKind, IconName>> = {
  manual: "pencil",
  email: "mail",
  whatsapp: "whatsapp",
  instagram: "instagram",
  messenger: "messenger",
  telegram: "telegram",
  widget: "message",
  phone: "phone",
};

/** Glifo de cada canal: o mesmo na lista, no cabeçalho, na bolha e no menu de resposta. */
export function channelGlyph(channel: ChannelKind): IconName {
  return GLYPHS[channel];
}

export interface ChannelChipProps {
  channel: ChannelKind;
  /** Nome da caixa (a conexão: «Instagram Loja Centro»). Sem conexão, o nome do canal. */
  title: string;
  /** Endereço da pessoa nesse canal: @usuario, número, e-mail. */
  handle?: string | null;
  /** Caixa por onde a resposta sai agora: folha pousada. */
  selected?: boolean;
  /** Canal que a pessoa tem, mas por onde ainda não conversou: só o contorno. */
  idle?: boolean;
  /** Com ação, o chip vira botão (escolher por onde responder). */
  onSelect?: () => void;
  disabled?: boolean;
}

/**
 * Canal de uma pessoa (atendimento): glifo do canal, nome da caixa e o
 * endereço dela. Três caixas de Instagram são três canais — o chip mostra a
 * caixa e o @, nunca só o ícone. Etiqueta de 26, cavada; a escolhida vira
 * folha pousada.
 */
export function ChannelChip({ channel, title, handle, selected = false, idle = false, onSelect, disabled = false }: ChannelChipProps) {
  const content = <>
    <Icon name={channelGlyph(channel)} />
    <span className={s.title}>{title}</span>
    {handle && <span className={s.handle}>{handle}</span>}
  </>;
  const full = handle ? `${title} · ${handle}` : title;
  if (!onSelect) return <span className={s.root} data-idle={idle || undefined} title={full}>{content}</span>;
  return <button type="button" className={s.root} data-press="ghost" data-selected={selected || undefined} data-idle={idle || undefined} aria-pressed={selected} disabled={disabled} title={full} onClick={onSelect}>{content}</button>;
}
