import type { ComponentProps, ReactNode } from "react";
import { Button } from "../Button/Button.js";
import { Icon } from "../Icon/Icon.js";
import styles from "./Feedback.module.css";
export type FeedbackTone = "neutral" | "success" | "warning" | "danger";
export function Badge({ tone = "neutral", children }: { tone?: FeedbackTone; children: ReactNode }) {
  return <span className={styles.badge} data-tone={tone}>{children}</span>;
}
export function Tag({ children, onRemove, removeLabel }: { children: ReactNode; onRemove?: () => void; removeLabel?: string }) {
  return <span className={styles.tag}>{children}{onRemove && <Button variant="ghost" size="sm" iconOnly icon={<Icon name="close" />} aria-label={removeLabel ?? "Remover etiqueta"} onClick={onRemove} />}</span>;
}
export function Alert({ tone = "neutral", title, children }: { tone?: FeedbackTone; title: string; children?: ReactNode }) {
  return <div role={tone === "danger" ? "alert" : "status"} className={styles.alert} data-tone={tone}><strong>{title}</strong>{children && <div>{children}</div>}</div>;
}
export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return <div aria-hidden="true" className={[styles.skeleton,className].filter(Boolean).join(" ")} {...props} />;
}
