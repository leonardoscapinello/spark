import { Injectable, NotFoundException } from "@nestjs/common";
import { eq, sql } from "drizzle-orm";
import { createDbClient, withOrgContext, stages, type SparkDb } from "@spark/db";
import type { Stage, CreateStageInput, OrgId, StageId } from "@spark/core";

@Injectable()
export class StagesRepository {
  private readonly db: SparkDb;

  constructor() {
    this.db = createDbClient(process.env.DATABASE_URL ?? "");
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
}

function toStage(row: {
  id: string;
  orgId: string;
  pipelineId: string;
  name: string;
  sortOrder: number;
  probability: number;
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
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    archivedAt: row.archivedAt?.toISOString() ?? null,
  } as Stage;
}
