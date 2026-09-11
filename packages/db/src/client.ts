import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import postgres from "postgres";
import * as schema from "./schema/index.js";
import type { OrgId } from "@spark/core";

/**
 * Creates a Drizzle client over a normal pool (no `max: 1`) — no need for
 * that: postgres.js's `db.transaction()` already reserves ONE connection
 * for the whole transaction, and `SET LOCAL` is scoped to the transaction
 * by Postgres itself (resets on its own at COMMIT/ROLLBACK). What actually
 * matters is that every business query goes through `withOrgContext` —
 * never around it.
 */
export function createDbClient(connectionString: string) {
  const client = postgres(connectionString, { prepare: false });
  return drizzle(client, { schema });
}

export type SparkDb = ReturnType<typeof createDbClient>;

/**
 * Runs `fn` inside a transaction with `app.current_org_id` set — this is
 * what every table's RLS policy reads (docs/adr/0022, docs/adr/0026).
 * Without this, `current_setting('app.current_org_id', true)` comes back
 * NULL and the policy denies everything by default — the correct security
 * posture, but also why no business query may run outside of this function.
 */
export async function withOrgContext<T>(
  db: SparkDb,
  orgId: OrgId,
  fn: (tx: SparkDb) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sqlSetOrgContext(orgId));
    return fn(tx as unknown as SparkDb);
  });
}

// Interpolated directly (not parameterized) because `SET LOCAL` doesn't
// accept a bind parameter in Postgres — orgId already went through core's
// branded type, so it's guaranteed to be a UUID, never arbitrary outside text.
function sqlSetOrgContext(orgId: OrgId) {
  return sql.raw(`SET LOCAL app.current_org_id = '${orgId}'`);
}
