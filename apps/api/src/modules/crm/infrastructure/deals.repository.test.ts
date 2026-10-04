import { BadRequestException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { dealId, orgId, pipelineId, stageId, stageFieldRuleId, userId, toCents } from "@spark/core";
import { deals, dealStageMoves, type SparkDb, type stageFieldRules } from "@spark/db";
import type { DomainEventWriter } from "../../events/application/domain-event-writer.js";
import type { CustomFieldWriter } from "../../settings/infrastructure/custom-field-writer.js";
import type { TagWriter } from "../../settings/infrastructure/tag-writer.js";
import { DealsRepository } from "./deals.repository.js";

const database = vi.hoisted(() => ({ transaction: vi.fn() }));
vi.mock("@spark/db", async (importOriginal) => ({
  ...await importOriginal<typeof import("@spark/db")>(),
  createAppDbClient: () => database,
}));

const org = orgId.create();
const actor = userId.create();
const pipeline = pipelineId.create();
const id = dealId.create();
const stageIds = [stageId.create(), stageId.create()] as const;
const timestamp = new Date("2026-09-01T12:00:00.000Z");
const stages = stageIds.map((id, sortOrder) => ({
  id, orgId: org, pipelineId: pipeline, name: sortOrder === 0 ? "Qualificação" : "Proposta",
  sortOrder, restrictTransitions: false, allowWon: true, allowLost: true,
}));

/** Only the database boundary is stubbed; mapping and field validation run for real. */
function query(rows: readonly unknown[]) {
  return Object.assign(Promise.resolve(rows), {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    for: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    returning: vi.fn().mockReturnThis(),
  });
}

function rule(stageIndex: 0 | 1, fieldKey: string, level = "required"): typeof stageFieldRules.$inferSelect {
  return { id: stageFieldRuleId.create(), orgId: org, pipelineId: pipeline, stageId: stageIds[stageIndex],
    fieldKey, level, createdAt: timestamp, updatedAt: timestamp };
}

function setup(from: 0 | 1, rules: (typeof stageFieldRules.$inferSelect)[], customValues: Record<string, unknown> = {}) {
  const to = from === 0 ? 1 : 0;
  const current: typeof deals.$inferSelect = {
    id, orgId: org, pipelineId: pipeline, stageId: stageIds[from], name: "Consultoria",
    amount: 150000, status: "open", contactId: null, companyId: null, ownerId: null,
    expectedCloseDate: null, lossReason: null, stageEnteredAt: timestamp,
    createdAt: timestamp, updatedAt: timestamp, deletedAt: null, isArchived: false,
    probabilityBasisPoints: null, probabilityCalculatedAt: null,
    probabilityVersion: null, probabilitySampleSize: null,
  };
  const updated = query([{ ...current, stageId: stageIds[to] }]);
  const insertValues = vi.fn().mockResolvedValue(undefined);
  const tx = {
    execute: vi.fn().mockResolvedValue([{ txid: "123" }]),
    select: vi.fn()
      .mockReturnValueOnce(query([current]))
      .mockReturnValueOnce(query([stages[from]]))
      .mockReturnValueOnce(query([stages[to]]))
      .mockReturnValueOnce(query(rules))
      .mockReturnValueOnce(query(stages))
      .mockReturnValueOnce(query([])) // No products linked.
      .mockReturnValueOnce(query([{ key: "budget", label: "Orçamento" }]))
      .mockImplementation(() => query([])), // Stage probability history.
    update: vi.fn((table) => table === deals ? updated : query([])),
    insert: vi.fn(() => ({ values: insertValues })),
  };
  database.transaction.mockImplementation((work: (tx: SparkDb) => Promise<unknown>) => work(tx as unknown as SparkDb));
  const events = { append: vi.fn().mockResolvedValue(undefined) };
  const customFields = { read: vi.fn().mockResolvedValue(customValues) };
  const repository = new DealsRepository(
    events as unknown as DomainEventWriter,
    customFields as unknown as CustomFieldWriter,
    {} as TagWriter,
  );
  return { repository, tx, updated, events, insertValues, target: stageIds[to] };
}

beforeEach(() => vi.clearAllMocks());

describe("DealsRepository.move with persisted stage rules", () => {
  it.each([0, 1] as const)("moves from stage %i with Date timestamps in the database rules", async (from) => {
    const { repository, tx, updated, events, insertValues, target } = setup(from,
      [rule(0, "custom:budget"), rule(1, "amount")], { budget: 8000 });

    const result = await repository.move(org, actor, id, target);

    expect(result.deal.stageId).toBe(target);
    expect(toCents(result.deal.amount)).toBe(150000);
    expect(result.txid).toBe(123);
    expect(updated.set).toHaveBeenCalledWith(expect.objectContaining({
      stageId: target, pipelineId: pipeline, stageEnteredAt: expect.any(Date),
    }));
    expect(tx.insert).toHaveBeenCalledWith(dealStageMoves);
    expect(insertValues).toHaveBeenCalledWith(expect.objectContaining({ fromStageId: stageIds[from], toStageId: target }));
    expect(events.append).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      type: "deal.stage_changed", dealId: id, orgId: org,
    }));
  });

  it.each([
    { from: 0, requiredAt: 0 }, { from: 0, requiredAt: 1 },
    { from: 1, requiredAt: 0 }, { from: 1, requiredAt: 1 },
  ] as const)("blocks missing custom field at $requiredAt when leaving $from with HTTP 400", async ({ from, requiredAt }) => {
    const { repository, tx, events, target } = setup(from, [rule(requiredAt, "custom:budget")]);

    const failure = await repository.move(org, actor, id, target).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(BadRequestException);
    if (!(failure instanceof BadRequestException)) throw new Error("Expected the missing-field response.");
    expect(failure.getStatus()).toBe(400);
    expect(failure.getResponse()).toMatchObject({
      code: "REQUIRED_STAGE_FIELDS",
      message: expect.stringContaining("Orçamento"),
      fields: [{ fieldKey: "custom:budget", stageId: stageIds[requiredAt], level: "required" }],
    });
    expect(tx.update).not.toHaveBeenCalled();
    expect(tx.insert).not.toHaveBeenCalled();
    expect(events.append).not.toHaveBeenCalled();
  });

  it.each(["products", "expectedCloseDate"])("still blocks the missing built-in field %s", async (fieldKey) => {
    const { repository, tx, target } = setup(0, [rule(0, fieldKey)]);
    await expect(repository.move(org, actor, id, target)).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.update).not.toHaveBeenCalled();
  });

  it("does not turn an important field into a requirement", async () => {
    const { repository, target } = setup(0, [rule(0, "custom:budget", "important")]);
    await expect(repository.move(org, actor, id, target)).resolves.toMatchObject({ deal: { stageId: target } });
  });
});
