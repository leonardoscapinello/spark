import { Injectable, NotFoundException } from "@nestjs/common";
import { and, eq, inArray, sql } from "drizzle-orm";
import { createAppDbClient, withOrgContext, stages, stageTransitions, type SparkDb } from "@spark/db";
import { stageTransitionId, type ConfigureStageInput, type Stage, type CreateStageInput, type OrgId, type StageId } from "@spark/core";

@Injectable()
export class StagesRepository {
  private readonly db: SparkDb;

  constructor() {
    this.db = createAppDbClient();
  }

  async create(orgId: OrgId, input: CreateStageInput): Promise<{ stage: Stage; txid: number }> {
    return withOrgContext(this.db, orgId, async (tx) => {
      const txidRows = await tx.execute<{ txid: string }>(sql`SELECT pg_current_xact_id()::xid::text as txid`);
      const txidRow = txidRows[0];
      if (!txidRow) throw new Error("Could not obtain the transaction's txid.");
      const { txid } = txidRow;

      const [row] = await tx
        .insert(stages)
        .values({
          id: input.id,
          orgId,
          pipelineId: input.pipelineId,
          name: input.name,
          sortOrder: input.sortOrder,
          probability: input.probability ?? 0,
          slaMinutes: input.slaMinutes ?? null,
          allowWon: input.allowWon ?? true,
          allowLost: input.allowLost ?? true,
          restrictTransitions: input.restrictTransitions ?? false,
        })
        .returning();

      if (!row) throw new Error("Stage insert returned no row.");

      return { stage: toStage(row), txid: Number(txid) };
    });
  }

  async rename(orgId: OrgId, id: StageId, name: string): Promise<{ stage: Stage; txid: number }> {
    return withOrgContext(this.db, orgId, async (tx) => {
      const txidRows = await tx.execute<{ txid: string }>(sql`SELECT pg_current_xact_id()::xid::text as txid`);
      const txidRow = txidRows[0];
      if (!txidRow) throw new Error("Could not obtain the transaction's txid.");
      const { txid } = txidRow;

      const [row] = await tx
        .update(stages)
        .set({ name, updatedAt: new Date() })
        .where(eq(stages.id, id))
        .returning();

      if (!row) throw new NotFoundException(`Stage ${id} not found.`);

      return { stage: toStage(row), txid: Number(txid) };
    });
  }

  async configure(orgId: OrgId, id: StageId, input: ConfigureStageInput): Promise<{ stage: Stage; txid: number }> {
    return withOrgContext(this.db, orgId, async (tx) => {
      const txidRows = await tx.execute<{ txid: string }>(sql`SELECT pg_current_xact_id()::xid::text as txid`);
      const txid = Number(txidRows[0]?.txid);
      const [current] = await tx.select().from(stages).where(and(eq(stages.orgId, orgId), eq(stages.id, id))).limit(1);
      if (!current) throw new NotFoundException(`Stage ${id} not found.`);
      if (input.allowedDestinationStageIds.includes(id)) throw new Error("A stage cannot transition to itself.");
      if (input.allowedDestinationStageIds.length > 0) {
        const targets = await tx.select({ id: stages.id }).from(stages).where(and(eq(stages.orgId, orgId), eq(stages.pipelineId, current.pipelineId), inArray(stages.id, input.allowedDestinationStageIds)));
        if (targets.length !== new Set(input.allowedDestinationStageIds).size) throw new Error("Every destination must belong to the same pipeline.");
      }
      const [row] = await tx.update(stages).set({ slaMinutes: input.slaMinutes, allowWon: input.allowWon, allowLost: input.allowLost, restrictTransitions: input.restrictTransitions, updatedAt: new Date() }).where(and(eq(stages.orgId, orgId), eq(stages.id, id))).returning();
      if (!row) throw new NotFoundException(`Stage ${id} not found.`);
      await tx.delete(stageTransitions).where(and(eq(stageTransitions.orgId, orgId), eq(stageTransitions.fromStageId, id)));
      if (input.restrictTransitions && input.allowedDestinationStageIds.length > 0) {
        await tx.insert(stageTransitions).values(input.allowedDestinationStageIds.map((toStageId) => ({ id: stageTransitionId.create(), orgId, pipelineId: current.pipelineId, fromStageId: id, toStageId })));
      }
      return { stage: toStage(row), txid };
    });
  }
}

function toStage(row: {
  id: string;
  orgId: string;
  pipelineId: string;
  name: string;
  sortOrder: number;
  probability: number;
  slaMinutes: number | null;
  allowWon: boolean;
  allowLost: boolean;
  restrictTransitions: boolean;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
}): Stage {
  return {
    id: row.id,
    orgId: row.orgId,
    pipelineId: row.pipelineId,
    name: row.name,
    sortOrder: row.sortOrder,
    probability: row.probability,
    slaMinutes: row.slaMinutes,
    allowWon: row.allowWon,
    allowLost: row.allowLost,
    restrictTransitions: row.restrictTransitions,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    archivedAt: row.archivedAt?.toISOString() ?? null,
  } as Stage;
}
