import { useState } from "react";
import styles from "./Avatar.module.css";

export interface AvatarProps {
  name: string;
  src?: string | null;
  /** small 24 · medium 32 · large 40 · hero 56 (origem: Perfil, "Avatar"). */
  size?: "small" | "medium" | "large" | "hero";
}

/** Pigmento estável por nome: a mesma pessoa tem sempre a mesma cor. */
function pigmentOf(name: string): 1 | 2 | 3 | 4 {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return ((hash % 4) + 1) as 1 | 2 | 3 | 4;
}

/** Avatar da identidade: círculo em pigmento com iniciais brancas em 500. */
export function Avatar({ name, src, size = "medium" }: AvatarProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? "").join("").toLocaleUpperCase("pt-BR");
  return <span className={styles.root} data-size={size} data-pigment={pigmentOf(name)} aria-hidden="true">
    {src && failedSrc !== src
      ? <img src={src} alt="" loading="lazy" onError={() => setFailedSrc(src)} />
      : initials || "?"}
  </span>;
}
