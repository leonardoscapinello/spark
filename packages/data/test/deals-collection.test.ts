/**
 * `syncedAmount` is the only boundary that normalizes `Deal.amount`
 * coming from the collection — and that row changes shape (found testing
 * for real in the browser, not just the compiler): optimistic/local is
 * already `Money`, synced/remote is a raw `bigint`. Unit test because
 * it's a pure function, no infrastructure — the real round-trip via
 * Electric is already covered by deals-collection.integration.test.ts.
 */
import { describe, expect, it } from "vitest";
import { money, toCents } from "@spark/core";
import { syncedAmount } from "../src/deals-collection.js";

describe("packages/data — syncedAmount", () => {
  it("still-optimistic row: amount is already Money (went through the local transform) — returns as-is", () => {
    const result = syncedAmount(money(8_990));
    expect(toCents(result)).toBe(8_990);
  });

  it("synced row: amount is a raw bigint from the Postgres column — converts to Money", () => {
    const result = syncedAmount(250_000n);
    expect(toCents(result)).toBe(250_000);
  });

  it("synced row: amount is a raw number — converts to Money", () => {
    const result = syncedAmount(150_000);
    expect(toCents(result)).toBe(150_000);
  });
});
