import { beforeEach, describe, expect, it, vi } from "vitest";
import { dealId, orgId, userId, toCents } from "@spark/core";
import type { SparkDb } from "@spark/db";
import type { DomainEventWriter } from "../../events/application/domain-event-writer.js";
import { DealPricingRepository } from "./deal-pricing.repository.js";

const database = vi.hoisted(() => ({ transaction: vi.fn() }));
vi.mock("@spark/db", async (importOriginal) => ({
  ...await importOriginal<typeof import("@spark/db")>(),
  createAppDbClient: () => database,
}));

function query(rows: readonly unknown[]) {
  return Object.assign(Promise.resolve(rows), {
    from: vi.fn().mockReturnThis(), where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(), orderBy: vi.fn().mockReturnThis(),
    for: vi.fn().mockReturnThis(), set: vi.fn().mockReturnThis(),
  });
}

const org = orgId.create();
const actor = userId.create();
const id = dealId.create();
const before = { amount: 150000, subscriptionInterval: null, subscriptionCycles: null, contractMonths: 12, installmentPolicyId: null, installments: 1 };

function setup(hasItems: boolean) {
  const lock = query([before]);
  const updates = query([]);
  const tx = {
    execute: vi.fn().mockResolvedValue([{ txid: "123" }]),
    select: vi.fn().mockReturnValueOnce(lock)
      .mockReturnValueOnce(query(hasItems ? [{ id: "item" }] : []))
      .mockReturnValueOnce(query([{ ...before, subscriptionInterval: "month", subscriptionCycles: 6 }]))
      .mockReturnValueOnce(query([{ quantityMilli: 1000, unitAmount: 10000, discountBasisPoints: 0, discountAmount: 0, taxBasisPoints: 0, recurring: true }]))
      .mockReturnValueOnce(query([])),
    update: vi.fn(() => updates),
  };
  // Somente a fronteira com o banco é simulada: cálculo e mapeamento são reais.
  database.transaction.mockImplementation((work: (tx: SparkDb) => Promise<unknown>) => work(tx as unknown as SparkDb));
  const events = { append: vi.fn().mockResolvedValue(undefined) };
  return { repository: new DealPricingRepository(events as unknown as DomainEventWriter), tx, lock, updates };
}

beforeEach(() => vi.clearAllMocks());

describe("condições e valor do negócio", () => {
  it("preserva o valor manual quando não existem itens", async () => {
    const { repository, tx, lock, updates } = setup(false);
    const result = await repository.updateTerms(org, actor, id, { contractMonths: 24 });
    expect(toCents(result.dealAmount)).toBe(150000);
    expect(tx.update).toHaveBeenCalledTimes(1);
    expect(updates.set).toHaveBeenCalledWith({ contractMonths: 24, updatedAt: expect.any(Date) });
    expect(lock.for).toHaveBeenCalledWith("update");
  });

  it("recalcula os itens recorrentes ao mudar o número de ciclos", async () => {
    const { repository, updates } = setup(true);
    const result = await repository.updateTerms(org, actor, id, { subscriptionInterval: "month", subscriptionCycles: 6 });
    expect(toCents(result.dealAmount)).toBe(60000);
    expect(updates.set).toHaveBeenLastCalledWith({ amount: 60000, updatedAt: expect.any(Date) });
  });

  it("aguarda o lock do negócio antes de alterar condições", async () => {
    const { repository, tx, lock } = setup(false);
    let release: ((rows: typeof before[]) => void) | undefined;
    lock.for.mockImplementation(() => new Promise<typeof before[]>(resolve => { release = resolve; }));
    const pending = repository.updateTerms(org, actor, id, { contractMonths: 24 });
    await vi.waitFor(() => expect(release).toBeDefined());
    expect(tx.update).not.toHaveBeenCalled();
    release?.([before]);
    await pending;
    expect(tx.update).toHaveBeenCalledTimes(1);
  });
});
