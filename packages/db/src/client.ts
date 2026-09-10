import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import postgres from "postgres";
import * as schema from "./schema/index.js";
import type { OrgId } from "@spark/core";

/**
 * Cria um client Drizzle sobre um pool normal (sem `max: 1`) — não precisa
 * disso: `db.transaction()` do postgres.js já reserva UMA conexão pro
 * transaction inteiro, e `SET LOCAL` é escopado à transação pelo próprio
 * Postgres (reseta sozinho no COMMIT/ROLLBACK). O que importa de verdade é
 * que toda query de negócio passe por `withOrgContext` — nunca por fora dele.
 */
export function createDbClient(connectionString: string) {
  const client = postgres(connectionString, { prepare: false });
  return drizzle(client, { schema });
}

export type SparkDb = ReturnType<typeof createDbClient>;

/**
 * Roda `fn` dentro de uma transação com `app.current_org_id` setado — é o
 * que a política de RLS de toda tabela lê (docs/adr/0022, docs/adr/0026).
 * Sem isto, `current_setting('app.current_org_id', true)` volta NULL e a
 * política nega tudo por padrão — é a postura de segurança certa, mas
 * também o motivo de nenhuma query de negócio poder rodar fora daqui.
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

// Interpolado direto (não parametrizado) porque `SET LOCAL` não aceita bind
// parameter no Postgres — orgId já passou pela marca de tipo do core, então
// é garantidamente um UUID, não texto arbitrário vindo de fora.
function sqlSetOrgContext(orgId: OrgId) {
  return sql.raw(`SET LOCAL app.current_org_id = '${orgId}'`);
}
