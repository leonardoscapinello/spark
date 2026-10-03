import { Avatar } from "../Avatar/Avatar.js";
import { Button } from "../Button/Button.js";
import { Icon } from "../Icon/Icon.js";
import { Surface } from "../Surface/Surface.js";
import s from "./NoteCard.module.css";

export interface NoteCardProps {
  author: string;
  authorAvatarUrl?: string | null;
  /** Quando foi escrita (ISO). Aparece em mono. */
  createdAt: string;
  body: string;
  /** Só quem escreveu remove. */
  onRemove?: (() => void) | undefined;
}

/**
 * Nota no histórico (origem: Perfil §2, "Cartão de perfil"): folha pousada de
 * raio 24 com o autor em avatar de 24, a hora em mono e o texto 13/1,55 em
 * tinta 2, respeitando as quebras de linha de quem escreveu.
 */
export function NoteCard({ author, authorAvatarUrl, createdAt, body, onRemove }: NoteCardProps) {
  return <Surface as="article" radius="lista" className={s.root ?? ""}>
    <header className={s.header}>
      <Avatar name={author} src={authorAvatarUrl ?? null} size="small" />
      <strong className={s.author}>{author}</strong>
      <time className={s.time} dateTime={createdAt}>{new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(createdAt))}</time>
      {onRemove && <Button size="sm" variant="ghost" iconOnly icon={<Icon name="trash" />} aria-label="Remover nota" onClick={onRemove} />}
    </header>
    <p className={s.body}>{body}</p>
  </Surface>;
}
