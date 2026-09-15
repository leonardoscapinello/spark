import { afterEach, describe, expect, it, vi } from "vitest";
import { LinkMetadataFetcher } from "./link-metadata-fetcher.js";

describe("LinkMetadataFetcher", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("para de baixar assim que recebe o head completo", async () => {
    const encoder = new TextEncoder();
    let cancelled = false;
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode('<html><head><meta property="og:title" content="Resposta rápida"></head><body>'));
      },
      cancel() { cancelled = true; },
    });
    vi.stubGlobal("fetch", vi.fn(async () => new Response(body, {
      status: 200,
      headers: { "content-type": "text/html" },
    })));

    const result = await new LinkMetadataFetcher().fetch("https://93.184.216.34/article");

    expect("notModified" in result).toBe(false);
    if (!("notModified" in result)) expect(result.title).toBe("Resposta rápida");
    expect(cancelled).toBe(true);
  });
});
