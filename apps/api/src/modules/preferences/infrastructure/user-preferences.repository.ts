import { Injectable } from "@nestjs/common";
import { sql } from "drizzle-orm";
import { createDbClient, userPreferences, withOrgContext, type SparkDb } from "@spark/db";
import type { OrgId, UpsertUserPreferenceInput, UserId, UserPreference } from "@spark/core";

/**
 * Sem DomainEventWriter: preferência de interface não é fato de negócio
 * (mesmo critério das visões salvas). Uma linha por (org, usuário, chave);
 * gravar de novo atualiza o valor e mantém o id da primeira gravação.
 */
@Injectable()
export class UserPreferencesRepository {
  private readonly db: SparkDb = createDbClient(process.env.DATABASE_URL ?? "");

  upsert(orgId: OrgId, userId: UserId, key: string, input: UpsertUserPreferenceInput): Promise<{ preference: UserPreference; txid: number }> {
    return withOrgContext(this.db, orgId, async (tx) => {
      const [row] = await tx.insert(userPreferences)
        .values({ id: input.id, orgId, userId, key, value: input.value })
        .onConflictDoUpdate({ target: [userPreferences.orgId, userPreferences.userId, userPreferences.key], set: { value: input.value, updatedAt: new Date() } })
        .returning();
      if (!row) throw new Error("User preference upsert returned no row.");
      return { preference: toPreference(row), txid: await captureTxid(tx) };
    });
  }
}

async function captureTxid(tx: SparkDb): Promise<number> {
  const rows = await tx.execute<{ txid: string }>(sql`SELECT pg_current_xact_id()::xid::text as txid`);
  const row = rows[0];
  if (!row) throw new Error("Could not obtain the transaction's txid.");
  return Number(row.txid);
}

function toPreference(row: typeof userPreferences.$inferSelect): UserPreference {
  return { ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() } as UserPreference;
}
