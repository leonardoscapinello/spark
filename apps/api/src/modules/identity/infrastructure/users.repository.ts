import { Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { createDbClient, users, type SparkDb } from "@spark/db";
import type { User } from "@spark/core";

/**
 * Resolving "which user is this JWT" is, by nature, a query that crosses
 * organizations — it's what DEFINES which organization the rest of the
 * request will operate in. That's why it uses the admin connection
 * (bypasses RLS), not app_user: there's no way to require
 * `app.current_org_id` to discover the very org_id it's looking for
 * (docs/adr/0022, docs/adr/0026). Every query AFTER this one, for the rest
 * of the request, goes through withOrgContext normally.
 */
@Injectable()
export class UsersRepository {
  private readonly db: SparkDb;

  constructor() {
    this.db = createDbClient(process.env.DATABASE_URL ?? "");
  }

  async findBySupabaseUserId(supabaseUserId: string): Promise<User | null> {
    const [row] = await this.db
      .select()
      .from(users)
      .where(eq(users.supabaseUserId, supabaseUserId))
      .limit(1);

    if (!row) return null;

    return {
      id: row.id,
      orgId: row.orgId,
      supabaseUserId: row.supabaseUserId,
      name: row.name,
      email: row.email,
      avatarUrl: row.avatarUrl,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      deactivatedAt: row.deactivatedAt?.toISOString() ?? null,
    } as User;
  }
}
