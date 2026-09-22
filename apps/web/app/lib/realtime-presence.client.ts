import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabaseClient } from "./supabase.client";

export interface PresenceUser { id: string; name: string }

interface UseConversationPresenceResult {
  viewers: PresenceUser[];
  typingUsers: PresenceUser[];
  notifyTyping: () => void;
}

const TYPING_EVENT = "typing";
const TYPING_TTL_MS = 4_000;
const TYPING_THROTTLE_MS = 2_000;

/** Presença (quem está vendo) + "digitando..." por canal, via Supabase Realtime — broadcast e presence não passam pela API (ADR-0005). */
export function useConversationPresence(channelKey: string | null, self: PresenceUser | null): UseConversationPresenceResult {
  const [viewers, setViewers] = useState<PresenceUser[]>([]);
  const [typingUsers, setTypingUsers] = useState<PresenceUser[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastTypingSentAt = useRef(0);
  const typingTimers = useRef(new Map<string, number>());

  useEffect(() => {
    for (const timer of typingTimers.current.values()) window.clearTimeout(timer);
    typingTimers.current.clear();
    setTypingUsers([]);
    setViewers([]);
    channelRef.current = null;
    if (!channelKey || !self) return;

    const client = getSupabaseClient();
    const channel = client.channel(`inbox:${channelKey}`, { config: { presence: { key: self.id } } });

    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState<PresenceUser>();
      const peers = Object.values(state).flat().filter((peer) => peer.id !== self.id);
      setViewers(dedupeById(peers));
    });
    channel.on("broadcast", { event: TYPING_EVENT }, ({ payload }: { payload: PresenceUser }) => {
      if (payload.id === self.id) return;
      setTypingUsers((current) => dedupeById([...current.filter((item) => item.id !== payload.id), payload]));
      const existingTimer = typingTimers.current.get(payload.id);
      if (existingTimer) window.clearTimeout(existingTimer);
      typingTimers.current.set(payload.id, window.setTimeout(() => {
        setTypingUsers((current) => current.filter((item) => item.id !== payload.id));
        typingTimers.current.delete(payload.id);
      }, TYPING_TTL_MS));
    });
    channel.subscribe((status) => { if (status === "SUBSCRIBED") void channel.track(self); });
    channelRef.current = channel;

    return () => {
      for (const timer of typingTimers.current.values()) window.clearTimeout(timer);
      typingTimers.current.clear();
      void channel.untrack();
      void client.removeChannel(channel);
      channelRef.current = null;
    };
  }, [channelKey, self?.id, self?.name]);

  function notifyTyping() {
    const channel = channelRef.current;
    if (!channel || !self) return;
    const now = Date.now();
    if (now - lastTypingSentAt.current < TYPING_THROTTLE_MS) return;
    lastTypingSentAt.current = now;
    void channel.send({ type: "broadcast", event: TYPING_EVENT, payload: self });
  }

  return { viewers, typingUsers, notifyTyping };
}

function dedupeById(items: PresenceUser[]): PresenceUser[] {
  return [...new Map(items.map((item) => [item.id, item])).values()];
}
