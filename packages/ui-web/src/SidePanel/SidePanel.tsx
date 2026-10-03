import { lightTheme } from "@spark/tokens/native-theme";
import { useEffect, useId, useRef, useState, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { Button } from "../Button/Button.js";
import { Icon } from "../Icon/Icon.js";
import { Surface } from "../Surface/Surface.js";
import styles from "./SidePanel.module.css";

export interface SidePanelProps extends Omit<ComponentPropsWithoutRef<"aside">, "title" | "children"> {
  /** Fechado, a folha sai deslizando (220 ms) antes de deixar a tela. */
  open: boolean;
  title: ReactNode;
  /** Linha curta acima do título: contexto ou tipo, em mono 11. */
  eyebrow?: ReactNode;
  /** Uma frase sob o título. */
  description?: ReactNode;
  /** Ações no rodapé, divididas por igual (origem: Drawer, "Reembolsar · Concluir"). */
  footer?: ReactNode;
  onClose?: (() => void) | undefined;
  closeLabel?: string;
  children?: ReactNode;
}

type Content = Pick<SidePanelProps, "title" | "eyebrow" | "description" | "footer" | "children">;

// Como na origem, a folha sai da tela depois do tempo da saída: 220 ms de lado
// ou 280 ms afundando (celular). Não depende de animationend, que não chega
// quando a animação está desligada.
const EXIT_MS = Math.max(Number.parseFloat(lightTheme["t-drawer-out"]), Number.parseFloat(lightTheme["t-sink"]));

/**
 * Painel lateral de ferramenta (origem: Sobreposições, "Drawer"; Mais, "Drawer
 * lateral"): folha segurada (--sf3 + granulação, --e3, raio 44) solta 12px das
 * bordas de quem a contém — o contêiner precisa de `position: relative`. Não
 * bloqueia a tela: fica ao lado do trabalho (construtores). Para bloquear,
 * use `Panel`. No celular vira folha inferior.
 */
export function SidePanel({ open, title, eyebrow, description, footer, onClose, closeLabel = "Fechar painel", children, className, ...rest }: SidePanelProps) {
  const titleId = useId();
  const [present, setPresent] = useState(open);
  // Enquanto sai, a folha mostra o último conteúdo aberto: quem chama pode
  // limpar a seleção na hora sem a folha trocar de conteúdo no caminho.
  const last = useRef<Content>({ title, eyebrow, description, footer, children });
  if (open) last.current = { title, eyebrow, description, footer, children };
  if (open && !present) setPresent(true);
  useEffect(() => {
    if (open || !present) return;
    const timer = window.setTimeout(() => setPresent(false), EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [open, present]);
  if (!present) return null;
  const shown = last.current;
  return <Surface
    as="aside"
    elevation="segurada"
    radius="xl"
    {...rest}
    aria-labelledby={titleId}
    data-closing={open ? undefined : ""}
    className={[styles.root, className].filter(Boolean).join(" ")}
  >
    <header className={styles.header}>
      <div className={styles.heading}>
        {shown.eyebrow && <span className={styles.eyebrow}>{shown.eyebrow}</span>}
        <h2 id={titleId} className={styles.title}>{shown.title}</h2>
        {shown.description && <p className={styles.description}>{shown.description}</p>}
      </div>
      {onClose && <Button variant="ghost" size="sm" iconOnly icon={<Icon name="close" />} aria-label={closeLabel} onClick={onClose} />}
    </header>
    <div className={styles.body}>{shown.children}</div>
    {shown.footer && <footer className={styles.footer}>{shown.footer}</footer>}
  </Surface>;
}
