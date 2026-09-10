import { Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { createDbClient, users, type SparkDb } from "@spark/db";
import type { User } from "@spark/core";

/**
 * Resolver "qual usuário é este JWT" é, por natureza, uma consulta que
 * atravessa organizações — é o que DEFINE em qual organização o resto da
 * requisição vai operar. Por isso usa a conexão admin (bypassa RLS), não
 * app_user: não dá pra exigir `app.current_org_id` pra descobrir justamente
 * qual é o org_id (docs/adr/0022, docs/adr/0026). Toda consulta DEPOIS
 * desta, no resto da requisição, passa por withOrgContext normalmente.
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
      nome: row.nome,
      email: row.email,
      avatarUrl: row.avatarUrl,
      criadoEm: row.criadoEm.toISOString(),
      atualizadoEm: row.atualizadoEm.toISOString(),
      desativadoEm: row.desativadoEm?.toISOString() ?? null,
    } as User;
  }
}
