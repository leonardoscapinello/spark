import type { User } from "@spark/core";
import { Avatar, type AvatarProps } from "../Avatar/Avatar.js";
import type { SelectOption } from "../Select/Select.js";

export interface UserAvatarProps extends Pick<AvatarProps, "size"> {
  /** A imagem sempre vem do perfil canônico; Avatar cuida somente do fallback. */
  user: Pick<User, "name" | "avatarUrl">;
}

export function UserAvatar({ user, size = "medium" }: UserAvatarProps) {
  return <Avatar name={user.name} src={user.avatarUrl} size={size} />;
}

/**
 * Fonte única para opções que representam usuários. Foto e identidade vêm
 * sempre do perfil canônico; integrações como Gravatar só precisam atualizar
 * `users.avatar_url`, e todos os seletores sincronizados refletem a mudança.
 */
export function userSelectOption(user: Pick<User, "id" | "name" | "email" | "avatarUrl">): SelectOption {
  return { value: user.id, label: user.name, description: user.email, avatar: user.avatarUrl };
}
