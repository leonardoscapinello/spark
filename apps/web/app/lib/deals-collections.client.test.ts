import { describe, expect, it, vi } from "vitest";
import { dealId } from "@spark/core";

const mocks = vi.hoisted(() => ({ createDeals: vi.fn(() => ({})) }));
vi.mock("@spark/data", () => ({
  createDealsCollection: mocks.createDeals,
  createPipelinesCollection: vi.fn(),
  createStagesCollection: vi.fn(),
}));
import { getDetailDealsCollection } from "./deals-collections.client";

describe("deal detail collections", () => {
  it("shares the same record subscription and keeps different records scoped", () => {
    const firstId = dealId.from("00000000-0000-7000-8000-000000000001");
    const secondId = dealId.from("00000000-0000-7000-8000-000000000002");
    const first = getDetailDealsCollection(firstId);
    const second = getDetailDealsCollection(secondId);
    expect(getDetailDealsCollection(firstId)).toBe(first);
    expect(second).not.toBe(first);
    expect(mocks.createDeals).toHaveBeenCalledTimes(2);
    expect(mocks.createDeals).toHaveBeenCalledWith({ dealId: firstId, collectionId: `deal-detail-${firstId}` });
    expect(mocks.createDeals).toHaveBeenCalledWith({ dealId: secondId, collectionId: `deal-detail-${secondId}` });
  });
});
