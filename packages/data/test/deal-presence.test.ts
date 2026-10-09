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

it("receives conversation typing separately from the viewer list and authenticates both paths", async () => {
  const { subscribeConversationPresence, sendConversationTyping } = await import("../src/deal-presence.js");
  const viewer = { userId: userId.create(), name: "Beatriz", avatarUrl: null };
  let source: ReadableStreamDefaultController<Uint8Array> | undefined;
  const body = new ReadableStream<Uint8Array>({ start(controller) {
    source = controller;
    const frames = `data: ${JSON.stringify([viewer])}\n\nevent: typing\ndata: ${JSON.stringify(viewer)}\n\n`;
    const bytes = new TextEncoder().encode(frames);
    controller.enqueue(bytes.slice(0, bytes.length - 5));
    controller.enqueue(bytes.slice(bytes.length - 5));
  } });
  const fetchMock = vi.fn(async (_url: string, options: RequestInit) => {
    if (options.method === "POST") return new Response(null, { status: 204 });
    options.signal?.addEventListener("abort", () => source?.error(new Error("aborted")), { once: true });
    return new Response(body);
  });
  vi.stubGlobal("fetch", fetchMock);
  setSparkApiBaseUrl("https://api.example.test");
  setSparkAuthTokenProvider(() => "private-token");
  let receive!: (value: typeof viewer) => void;
  const typing = new Promise<typeof viewer>((resolve) => { receive = resolve; });
  const states: DealPresenceState[] = [];
  const stop = subscribeConversationPresence("conversation", (state) => states.push(state), receive);
  try {
    expect(await typing).toEqual(viewer);
    expect(states.at(-1)).toEqual({ status: "connected", viewers: [viewer] });
    await sendConversationTyping("conversation", new AbortController().signal);
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "https://api.example.test/v1/conversations/conversation/presence",
      "https://api.example.test/v1/conversations/conversation/typing",
    ]);
    for (const [, options] of fetchMock.mock.calls) expect(options.headers).toEqual({ authorization: "Bearer private-token" });
    expect(fetchMock.mock.calls[1]?.[1].body).toBeUndefined();
  } finally { stop(); vi.unstubAllGlobals(); }
});
