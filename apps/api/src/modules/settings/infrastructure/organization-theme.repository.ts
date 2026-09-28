import { Injectable } from "@nestjs/common";
import { sql } from "drizzle-orm";
import { createAppDbClient, organizationThemes, withOrgContext, type SparkDb } from "@spark/db";
import type { OrgId, OrganizationTheme, UpdateOrganizationThemeInput } from "@spark/core";

@Injectable()
export class OrganizationThemeRepository {
  private readonly db: SparkDb = createAppDbClient();

  update(orgId: OrgId, input: UpdateOrganizationThemeInput): Promise<{ theme: OrganizationTheme; txid: number }> {
    return withOrgContext(this.db, orgId, async (tx) => {
      const [row] = await tx.insert(organizationThemes)
        .values({ orgId, ...input, updatedAt: new Date() })
        .onConflictDoUpdate({ target: organizationThemes.orgId, set: { ...input, updatedAt: new Date() } })
        .returning();
      if (!row) throw new Error("Organization theme upsert returned no row.");
      return { theme: toTheme(row), txid: await captureTxid(tx) };
    });
  }
}

async function captureTxid(tx: SparkDb): Promise<number> {
  const rows = await tx.execute<{ txid: string }>(sql`SELECT pg_current_xact_id()::xid::text as txid`);
  const row = rows[0];
  if (!row) throw new Error("Could not obtain the transaction's txid.");
  return Number(row.txid);
}

function toTheme(row: typeof organizationThemes.$inferSelect): OrganizationTheme {
  return { ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() } as OrganizationTheme;
}

