import { Injectable } from "@nestjs/common";
import { sql } from "drizzle-orm";
import { createAppDbClient, withOrgContext, pipelines, type SparkDb } from "@spark/db";
import type { Pipeline, CreatePipelineInput, OrgId } from "@spark/core";

/** Same pattern as ContactsRepository — withOrgContext, real RLS, captures txid (docs/adr/0018, docs/adr/0022). */
@Injectable()
export class PipelinesRepository {
  private readonly db: SparkDb;

  constructor() {
    this.db = createAppDbClient();
  }

  async create(orgId: OrgId, input: CreatePipelineInput): Promise<{ pipeline: Pipeline; txid: number }> {
    return withOrgContext(this.db, orgId, async (tx) => {
      const txidRows = await tx.execute<{ txid: string }>(sql`SELECT pg_current_xact_id()::xid::text as txid`);
      const txidRow = txidRows[0];
      if (!txidRow) throw new Error("Could not obtain the transaction's txid.");
      const { txid } = txidRow;

      const [row] = await tx
        .insert(pipelines)
        .values({ id: input.id, orgId, name: input.name, isDefault: input.isDefault ?? false })
        .returning();

      if (!row) throw new Error("Pipeline insert returned no row.");

      return { pipeline: toPipeline(row), txid: Number(txid) };
    });
  }
}

function toPipeline(row: {
  id: string;
  orgId: string;
  name: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
}): Pipeline {
  return {
    id: row.id,
    orgId: row.orgId,
    name: row.name,
    isDefault: row.isDefault,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    archivedAt: row.archivedAt?.toISOString() ?? null,
  } as Pipeline;
}
