import styles from "./Spinner.module.css";

/** Ensō (§10): um traço de 1,5 que gira em 700 ms, na cor do texto ao redor.
 * Com `label`, anuncia a espera; sem, é decorativo (o botão já diz aria-busy). */
export function Spinner({ size = "md", label }: { size?: "sm" | "md" | undefined; label?: string | undefined }) {
  return <span className={styles.root} data-size={size} {...(label ? { role: "status", "aria-label": label } : { "aria-hidden": true })} />;
}
