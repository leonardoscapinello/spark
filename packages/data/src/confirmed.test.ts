import { describe, expect, it } from "vitest";
import { confirmed } from "./confirmed.js";

describe("confirmed", () => {
  it("hands the txid to TanStack DB when the API confirmed the write", () => {
    expect(confirmed({ txid: 42 })).toEqual({ txid: 42 });
  });
  it("returns void when the write was queued by the service worker (no txid yet)", () => {
    expect(confirmed({ queued: true } as { txid?: number })).toBeUndefined();
    expect(confirmed({ txid: null })).toBeUndefined();
  });
});
