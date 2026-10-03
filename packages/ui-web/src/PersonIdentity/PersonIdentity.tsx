import type { ReactNode } from "react";
import { Avatar } from "../Avatar/Avatar.js";
import styles from "./PersonIdentity.module.css";

export interface PersonIdentityProps {
  name: string;
  /** Segunda linha: e-mail, razão social, rede. 12 em tinta 2. */
  detail?: ReactNode;
  /** Foto; sem ela, as iniciais em pigmento. */
  src?: string | null;
  /** Avatar pronto (UserAvatar, logotipo). Ocupa o mesmo encaixe de 32. */
  avatar?: ReactNode;
}

/**
 * Identidade numa linha de lista (origem: Dados, "Tabela"): avatar de 32 e
 * duas linhas — nome em 500 13, detalhe em 12 tinta 2 — que cortam com
 * reticências em vez de quebrar a altura de 52 da linha.
 */
export function PersonIdentity({ name, detail, src, avatar }: PersonIdentityProps) {
  return <span className={styles.root}>
    {avatar ?? <Avatar name={name} src={src ?? null} />}
    <span className={styles.copy}>
      <span className={styles.name}>{name}</span>
      {detail !== undefined && detail !== null && detail !== "" && <span className={styles.detail}>{detail}</span>}
    </span>
  </span>;
}
