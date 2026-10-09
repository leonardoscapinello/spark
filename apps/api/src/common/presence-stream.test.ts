import { expect, it, vi } from "vitest";
import Fastify from "fastify";
import { conversationId, orgId, userId, type DealViewer } from "@spark/core";
import { streamPresence } from "./presence-stream.js";
import type { ResourcePresenceService } from "./resource-presence.service.js";

it("keeps presence open after GET completes and releases its lease/listener when the reader leaves", async () => {
  const viewer = { userId: userId.create(), name: "Ana", avatarUrl: null };
  let released!: () => void;
  const closed = new Promise<void>((resolve) => { released = resolve; });
  const leave = vi.fn(async () => { released(); });
  const stopTyping = vi.fn();
  const presence = {
    listenTyping: vi.fn(async () => stopTyping),
    join: vi.fn(async (_org, _resource, _viewer, send: (viewers: DealViewer[]) => void) => {
      send([viewer]);
      return { renew: vi.fn(), leave };
    }),
  } as unknown as ResourcePresenceService;
  const app = Fastify();
  app.get("/presence", async (_request, reply) => streamPresence({
    presence, orgId: orgId.create(), resource: { kind: "conversation", id: conversationId.create() },
    viewer, expiresAt: Date.now() + 60_000, reply,
  }));
  const url = await app.listen({ host: "127.0.0.1", port: 0 });
  const abort = new AbortController();
  try {
    const response = await fetch(`${url}/presence`, { signal: abort.signal });
    const reader = response.body!.getReader();
    const first = await reader.read();
    expect(new TextDecoder().decode(first.value)).toContain(JSON.stringify([viewer]));
    expect(leave).not.toHaveBeenCalled();
    await reader.cancel();
    abort.abort();
    await closed;
    expect(leave).toHaveBeenCalledOnce();
    expect(stopTyping).toHaveBeenCalledOnce();
  } finally { abort.abort(); await app.close(); }
});
