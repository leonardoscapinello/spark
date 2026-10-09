import { useEffect, useRef, useState } from "react";
import { sendConversationTyping, subscribeConversationPresence } from "@spark/data";

export interface PresenceUser { id: string; name: string }
interface UseConversationPresenceResult {
  viewers: PresenceUser[];
  typingUsers: PresenceUser[];
  notifyTyping: () => void;
}
const TYPING_TTL_MS = 4_000;
const TYPING_THROTTLE_MS = 2_000;

/** Authenticated ephemeral presence; server determines organization and author. */
export function useConversationPresence(conversationId: string | null, self: PresenceUser | null): UseConversationPresenceResult {
  const [viewers, setViewers] = useState<PresenceUser[]>([]);
  const [typingUsers, setTypingUsers] = useState<PresenceUser[]>([]);
  const notifyRef = useRef<() => void>(() => undefined);
  const selfId = self?.id;

  useEffect(() => {
    setTypingUsers([]);
    setViewers([]);
    if (!conversationId || !selfId) return;
    const timers = new Map<string, ReturnType<typeof setTimeout>>();
    const abort = new AbortController();
    let connected = false;
    let pending = false;
    let lastSentAt = 0;
    const clearTyping = () => {
      for (const timer of timers.values()) clearTimeout(timer);
      timers.clear();
      setTypingUsers([]);
    };
    const stop = subscribeConversationPresence(conversationId, (state) => {
      connected = state.status === "connected";
      setViewers(state.viewers.filter((viewer) => viewer.userId !== selfId).map((viewer) => ({ id: viewer.userId, name: viewer.name })));
      if (!connected) clearTyping();
    }, (viewer) => {
      if (viewer.userId === selfId) return;
      const peer = { id: viewer.userId, name: viewer.name };
      setTypingUsers((current) => [...current.filter((item) => item.id !== peer.id), peer]);
      clearTimeout(timers.get(peer.id));
      timers.set(peer.id, setTimeout(() => {
        setTypingUsers((current) => current.filter((item) => item.id !== peer.id));
        timers.delete(peer.id);
      }, TYPING_TTL_MS));
    });
    notifyRef.current = () => {
      const now = Date.now();
      if (!connected || pending || now - lastSentAt < TYPING_THROTTLE_MS) return;
      lastSentAt = now;
      pending = true;
      void sendConversationTyping(conversationId, abort.signal).catch(() => undefined).finally(() => { pending = false; });
    };
    return () => {
      notifyRef.current = () => undefined;
      stop();
      abort.abort();
      for (const timer of timers.values()) clearTimeout(timer);
      timers.clear();
    };
  }, [conversationId, selfId]);

  return { viewers, typingUsers, notifyTyping: () => notifyRef.current() };
}
