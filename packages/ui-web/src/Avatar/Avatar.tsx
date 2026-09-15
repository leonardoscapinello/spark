import { useState } from "react";
import styles from "./Avatar.module.css";

export interface AvatarProps {
  name: string;
  src?: string | null;
  size?: "small" | "medium" | "large" | "hero";
}

export function Avatar({ name, src, size = "medium" }: AvatarProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? "").join("").toLocaleUpperCase("pt-BR");
  return <span className={styles.root} data-size={size} aria-hidden="true">
    {src && failedSrc !== src
      ? <img src={src} alt="" loading="lazy" onError={() => setFailedSrc(src)} />
      : initials || "?"}
  </span>;
}
