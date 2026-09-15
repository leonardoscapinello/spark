import { DealPresenceSchema, type DealViewer } from "@spark/core";
import { getSparkApiBaseUrl, getSparkAuthToken, refreshSparkAuthToken } from "@spark/api-client";

export interface DealPresenceState { status: "connecting" | "connected" | "unavailable"; viewers: DealViewer[] }

/** Ephemeral presence uses the same HTTP/2 origin, never the save queue. */
export function subscribeDealPresence(dealId: string, onState: (state: DealPresenceState) => void): () => void {
  let stopped = false;
  let active: AbortController | undefined;
  let retry: ReturnType<typeof setTimeout> | undefined;
  let attempts = 0;
  const emit = (state: DealPresenceState) => { if (!stopped) onState(state); };

  async function connect() {
    const abort = new AbortController();
    active = abort;
    let deadline: ReturnType<typeof setTimeout>;
    const renewDeadline = () => { clearTimeout(deadline); deadline = setTimeout(() => abort.abort(), 45_000); };
    renewDeadline();
    try {
      const request = () => fetch(`${getSparkApiBaseUrl()}/v1/deals/${encodeURIComponent(dealId)}/presence`, {
        headers: { authorization: `Bearer ${getSparkAuthToken() ?? ""}` }, signal: abort.signal,
      });
      let response = await request();
      if (response.status === 401) {
        await response.body?.cancel();
        await refreshSparkAuthToken();
        response = await request();
      }
      if (!response.ok || !response.body) {
        await response.body?.cancel();
        if ([401, 403, 404].includes(response.status)) {
          emit({ status: "unavailable", viewers: [] });
          stopped = true;
          return;
        }
        throw new Error("Presence unavailable");
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      try {
        while (!stopped) {
          const { done, value } = await reader.read();
          if (done) break;
          renewDeadline();
          buffer += decoder.decode(value, { stream: true });
          if (buffer.length > 256_000) throw new Error("Invalid presence stream");
          let boundary: number;
          while ((boundary = buffer.indexOf("\n\n")) >= 0) {
            const frame = buffer.slice(0, boundary);
            buffer = buffer.slice(boundary + 2);
            if (!frame.startsWith("data: ")) continue;
            const viewers = DealPresenceSchema.parse(JSON.parse(frame.slice(6)));
            attempts = 0;
            emit({ status: "connected", viewers });
          }
        }
      } finally { await reader.cancel().catch(() => undefined); reader.releaseLock(); }
    } catch { /* Presence failure must never block or fail a field save. */ }
    finally { clearTimeout(deadline!); }
    if (!stopped) {
      emit({ status: "unavailable", viewers: [] });
      retry = setTimeout(() => { void connect(); }, Math.min(5_000, 500 * 2 ** attempts++));
    }
  }

  emit({ status: "connecting", viewers: [] });
  void connect();
  return () => { stopped = true; clearTimeout(retry); active?.abort(); };
}
