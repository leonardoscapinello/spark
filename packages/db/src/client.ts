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
/**
 * Um pool por endereço de banco, compartilhado — e não um por chamada.
 *
 * Cada repositório do backend chama esta função no próprio construtor, e são
 * 38 deles. Sem a memória abaixo, um processo da API abria 38 pools; com o
 * padrão de dez conexões cada, isso são até 380 conexões de UM processo, e o
 * Postgres recusa muito antes disso com «remaining connection slots are
 * reserved for roles with the SUPERUSER attribute» — a API inteira, e o
 * Electric junto, param de responder por esgotamento.
 *
 * A memória é por endereço: teste com outro banco continua tendo o seu pool, e
 * quem chama não muda nada.
 */
const pools = new Map<string, ReturnType<typeof drizzle<typeof schema>>>();

/**
 * Teto de conexões do processo, explícito e orçado — não o padrão da
 * biblioteca.
 *
 * A conta que justifica o número: o projeto Supabase aceita 60 conexões, três
 * ficam reservadas ao superusuário e catorze são dos serviços do próprio
 * Supabase (PostgREST, Storage, pg_cron, pgbouncer, exporter). Sobram 43 para
 * nós, e o Electric precisa da parte dele. Doze deixa folga para o `psql` de
 * quem está depurando e para o painel.
 *
 * O padrão do postgres.js é 10 POR POOL, o que só era seguro quando havia um
 * pool. Deixar implícito foi o que permitiu a API pedir 380 conexões sem que
 * ninguém tivesse escrito esse número em lugar nenhum.
 */
const MAX_CONEXOES = Number(process.env.DATABASE_POOL_MAX ?? 12);

export function createDbClient(connectionString: string) {
  const existente = pools.get(connectionString);
  if (existente) return existente;
  const client = postgres(connectionString, {
    prepare: false,
    max: MAX_CONEXOES,
    /* Conexão ociosa devolvida ao banco em vez de guardada para sempre: num
     * processo que fica de pé por dias, pool cheio de conexão parada é
     * orçamento tomado de quem precisa. */
    idle_timeout: 30,
    /* Espera por uma conexão livre em vez de estourar na hora: sob pico, a
     * requisição fica na fila alguns segundos e passa, em vez de virar erro. */
    connect_timeout: 15,
  });
  const db = drizzle(client, { schema });
  pools.set(connectionString, db);
  return db;
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
