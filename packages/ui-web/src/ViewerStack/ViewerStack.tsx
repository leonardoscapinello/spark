import type { DealViewer } from "@spark/core";
import { Avatar } from "../Avatar/Avatar.js";
import { Tooltip } from "../Tooltip/Tooltip.js";
import styles from "./ViewerStack.module.css";

export interface ViewerStackProps { viewers: readonly DealViewer[]; currentUserId?: string; status: "connecting" | "connected" | "unavailable" }

export function ViewerStack({ viewers, currentUserId, status }: ViewerStackProps) {
  if (status !== "connected") return <span className={styles.notice} role="status">{status === "connecting" ? "Conectando presença…" : "Presença indisponível"}</span>;
  const label = (viewer: DealViewer) => `${viewer.name}${viewer.userId === currentUserId ? " (você)" : ""} está visualizando`;
  const overflow = viewers.slice(4);
  return <div className={styles.root} role="group" aria-label="Pessoas visualizando este negócio">
    {viewers.slice(0, 4).map((viewer) => <Tooltip key={viewer.userId} content={label(viewer)}>
      <button type="button" className={styles.viewer} aria-label={label(viewer)}><Avatar name={viewer.name} src={viewer.avatarUrl} size="small" /></button>
    </Tooltip>)}
    {overflow.length > 0 && <Tooltip content={overflow.map((viewer) => viewer.name).join(", ")}><button type="button" className={styles.more} aria-label={`Mais ${overflow.length} pessoas visualizando`}>+{overflow.length}</button></Tooltip>}
  </div>;
}
