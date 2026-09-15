import { useEffect, useState } from "react";
import { subscribeDealPresence, type DealPresenceState } from "@spark/data";

export function useDealPresence(dealId: string | undefined): DealPresenceState {
  const [state, setState] = useState<DealPresenceState>({ status: "connecting", viewers: [] });
  useEffect(() => {
    if (!dealId) return;
    return subscribeDealPresence(dealId, setState);
  }, [dealId]);
  return state;
}
