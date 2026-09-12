import type { ReactNode } from "react";
import { Icon, type IconName } from "../Icon/Icon.js";
import styles from "./EmptyState.module.css";

export interface EmptyStateProps {
  icon: IconName;
  title: string;
  description: string;
  action?: ReactNode;
  secondaryAction?: ReactNode;
  variant?: "default" | "onboarding" | "featured";
}

export function EmptyState({ icon, title, description, action, secondaryAction, variant = "default" }: EmptyStateProps) {
  return <section className={styles.root} data-variant={variant} aria-label={title}>
    <span className={styles.icon} aria-hidden="true">
      {variant === "featured" ? <FeaturedArt icon={icon} /> : <Icon name={icon} />}
    </span>
    <h2>{title}</h2>
    <p>{description}</p>
    {(action || secondaryAction) && <div className={styles.actions}>{action}{secondaryAction}</div>}
  </section>;
}

function FeaturedArt({ icon }: { icon: IconName }) {
  const kind = icon === "chart" ? "chart"
    : icon === "bolt" || icon === "briefcase" ? "flow"
    : icon === "calendar" ? "calendar"
    : icon === "mail" || icon === "message" ? "conversation"
    : "record";

  return <span className={styles.artCard} data-art={kind}>
    {kind !== "record" && <span className={styles.mobileArtSymbol}><Icon name={icon} /></span>}
    {kind === "chart" && <span className={styles.artChart}><span /><span /><span /><span /><span /></span>}
    {kind === "flow" && <span className={styles.artFlow}>
      <span className={styles.artFlowNode}><Icon name={icon} /></span>
      <span className={styles.artFlowConnector} />
      <span className={styles.artFlowNode}><Icon name="check" /></span>
    </span>}
    {kind === "calendar" && <span className={styles.artCalendar}>
      <span className={styles.artCalendarHeader}><Icon name="calendar" /><span /><span /></span>
      <span className={styles.artCalendarDays}>{Array.from({ length: 12 }, (_, index) => <span key={index} data-active={index === 8 || undefined} />)}</span>
    </span>}
    {kind === "conversation" && <span className={styles.artConversation}>
      <span><Icon name={icon} /><span><span /><span /></span></span>
      <span><Icon name="check" /><span><span /><span /></span></span>
    </span>}
    {kind === "record" && <>
      <span className={styles.artSymbol}><Icon name={icon} /></span>
      <span className={styles.artLines}><span /><span /><span /></span>
      <span className={styles.artFoot}><span /><span /></span>
    </>}
  </span>;
}
