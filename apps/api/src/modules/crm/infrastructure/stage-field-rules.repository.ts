import { Injectable, NotFoundException } from "@nestjs/common";
import { eq, sql } from "drizzle-orm";
import { createAppDbClient, stageFieldRules, withOrgContext, type SparkDb } from "@spark/db";
import type { CreateStageFieldRuleInput, OrgId, StageFieldRule, StageFieldRuleId } from "@spark/core";

/**
 * Regras de campo por etapa. Gravar de novo o mesmo campo na mesma etapa troca
 * o nível — a chave única (org, etapa, campo) garante uma regra por campo.
 */
@Injectable()
export class StageFieldRulesRepository {
  private readonly db: SparkDb = createAppDbClient();

  save(orgId: OrgId, input: CreateStageFieldRuleInput): Promise<{ rule: StageFieldRule; txid: number }> {
    return withOrgContext(this.db, orgId, async (tx) => {
      const [row] = await tx.insert(stageFieldRules)
        .values({ id: input.id, orgId, pipelineId: input.pipelineId, stageId: input.stageId, fieldKey: input.fieldKey, level: input.level })
        .onConflictDoUpdate({ target: [stageFieldRules.orgId, stageFieldRules.stageId, stageFieldRules.fieldKey], set: { level: input.level, updatedAt: new Date() } })
        .returning();
      if (!row) throw new Error("Stage field rule upsert returned no row.");
      return { rule: toRule(row), txid: await captureTxid(tx) };
    });
  }

  remove(orgId: OrgId, id: StageFieldRuleId): Promise<{ rule: null; txid: number }> {
    return withOrgContext(this.db, orgId, async (tx) => {
      const [row] = await tx.delete(stageFieldRules).where(eq(stageFieldRules.id, id)).returning();
      if (!row) throw new NotFoundException(`Stage field rule ${id} not found.`);
      return { rule: null, txid: await captureTxid(tx) };
    });
  }
}

async function captureTxid(tx: SparkDb): Promise<number> {
  const rows = await tx.execute<{ txid: string }>(sql`SELECT pg_current_xact_id()::xid::text as txid`);
  const row = rows[0];
  if (!row) throw new Error("Could not obtain the transaction's txid.");
  return Number(row.txid);
}

function toRule(row: typeof stageFieldRules.$inferSelect): StageFieldRule {
  return { ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() } as StageFieldRule;
}
