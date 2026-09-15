import type { User } from "@spark/core";
import { Avatar, type AvatarProps } from "../Avatar/Avatar.js";

export interface UserAvatarProps extends Pick<AvatarProps, "size"> {
  /** A imagem sempre vem do perfil canônico; Avatar cuida somente do fallback. */
  user: Pick<User, "name" | "avatarUrl">;
}

export function UserAvatar({ user, size = "medium" }: UserAvatarProps) {
  return <Avatar name={user.name} src={user.avatarUrl} size={size} />;
}
