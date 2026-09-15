import { afterEach, describe, expect, it, vi } from "vitest";
import { userId } from "@spark/core";
import { setSparkApiBaseUrl, setSparkAuthTokenProvider } from "@spark/api-client";
import { subscribeDealPresence, type DealPresenceState } from "../src/deal-presence.js";

describe("deal presence transport", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("decodes split frames and aborts when leaving the deal", async () => {
    const viewer = { userId: userId.create(), name: "Ana", avatarUrl: null };
    let requestSignal: AbortSignal | undefined;
    let source: ReadableStreamDefaultController<Uint8Array> | undefined;
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        source = controller;
        const bytes = new TextEncoder().encode(`: heartbeat\n\ndata: ${JSON.stringify([viewer])}\n\n`);
        controller.enqueue(bytes.slice(0, 19));
        controller.enqueue(bytes.slice(19));
      },
    });
    vi.stubGlobal("fetch", vi.fn(async (_url: string, options: RequestInit) => {
      requestSignal = options.signal ?? undefined;
      // A real fetch body errors when its request signal aborts.
      requestSignal?.addEventListener("abort", () => source?.error(new Error("aborted")), { once: true });
      return new Response(body);
    }));
    setSparkApiBaseUrl("https://api.example.test");
    setSparkAuthTokenProvider(() => "test-jwt");
    let connected!: (state: DealPresenceState) => void;
    const ready = new Promise<DealPresenceState>((resolve) => { connected = resolve; });
    const stop = subscribeDealPresence("deal", (state) => { if (state.status === "connected") connected(state); });
    try { expect((await ready).viewers).toEqual([viewer]); }
    finally { stop(); }
    expect(requestSignal?.aborted).toBe(true);
    // No second request, no field-write queue, and no POST on leave.
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("does not retry forbidden access indefinitely", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 403 })));
    let failed!: () => void;
    const unavailable = new Promise<void>((resolve) => { failed = resolve; });
    const stop = subscribeDealPresence("deal", (state) => { if (state.status === "unavailable") failed(); });
    try { await unavailable; expect(fetch).toHaveBeenCalledOnce(); } finally { stop(); }
  });
});
