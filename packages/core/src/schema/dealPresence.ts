import { z } from "zod";
import { zUserId } from "./zodHelpers.js";

export const DealViewerSchema = z.object({ userId: zUserId, name: z.string().min(1).max(200), avatarUrl: z.url().nullable() });
export type DealViewer = z.infer<typeof DealViewerSchema>;
export const DealPresenceSchema = z.array(DealViewerSchema);

/** Uma pessoa aparece uma vez, mesmo com o negócio aberto em várias abas. */
export function uniqueDealViewers(sessions: readonly DealViewer[]): DealViewer[] {
  return [...new Map(sessions.map((viewer) => [viewer.userId, viewer])).values()]
    .sort((left, right) => left.userId.localeCompare(right.userId));
}
