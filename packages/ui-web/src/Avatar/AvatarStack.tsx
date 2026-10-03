import type { ReactNode } from "react";
import styles from "./AvatarStack.module.css";

/**
 * Grupo de pessoas (origem: Perfil, "avatar-grupo"): avatares sobrepostos em
 * −8 px com um anel do papel em volta, o excedente vira +N. É o único jeito
 * de empilhar avatares — seguidores, quem está vendo, participantes. Quem
 * precisa de clique por pessoa embrulha cada avatar num botão; o grupo cuida
 * da sobreposição e do anel. Dentro de um botão, o anel assume a cor dele.
 */
export function AvatarStack({ children, overflow = 0 }: { children: ReactNode; overflow?: number }) {
  return (
    <span className={styles.root} data-avatar-stack="">
      {children}
      {overflow > 0 && <span className={styles.more}>+{overflow}</span>}
    </span>
  );
}
