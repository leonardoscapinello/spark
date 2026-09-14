import { sql } from "drizzle-orm";
import { eventPartitionsFor } from "@spark/core";
import type { SparkDb } from "./client.js";

/**
 * Garante as partições mensais de `events` para o mês corrente e os
 * `monthsAhead` seguintes. Idempotente (IF NOT EXISTS) — roda todo dia no
 * apps/scheduler e pode rodar quantas vezes for.
 *
 * Nome e limites vêm de packages/core a partir de números, nunca de texto
 * externo — é o que torna aceitável o `sql.raw` aqui, pelo mesmo motivo de
 * sqlSetOrgContext em client.ts (DDL não aceita bind parameter).
 *
 * A partição DEFAULT (migration 0028) é a rede de segurança para o caso de
 * o scheduler ficar fora do ar além do horizonte: a linha entra em
 * events_default em vez de derrubar a transação. Se isso acontecer, a
 * partição do mês precisa ser criada por operação manual — o Postgres não
 * deixa criar uma faixa que já tem linhas na DEFAULT: detach da default,
 * create do mês, reinsert das linhas, attach.
 */
export async function ensureEventPartitions(db: SparkDb, now = new Date(), monthsAhead = 3): Promise<string[]> {
  const ensured: string[] = [];
  for (const partition of eventPartitionsFor(now, monthsAhead)) {
    await db.execute(sql.raw(
      `CREATE TABLE IF NOT EXISTS "${partition.name}" PARTITION OF "events" FOR VALUES FROM ('${partition.from}') TO ('${partition.to}')`,
    ));
    ensured.push(partition.name);
  }
  return ensured;
}
