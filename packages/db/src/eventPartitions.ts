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
  return ensureMonthlyPartitions(db, "events", now, monthsAhead);
}

/** Mesma manutenção para o segundo fluxo append-heavy (ADR-0021). */
export async function ensureMessagePartitions(db: SparkDb, now = new Date(), monthsAhead = 3): Promise<string[]> {
  return ensureMonthlyPartitions(db, "messages", now, monthsAhead);
}

async function ensureMonthlyPartitions(db: SparkDb, table: "events" | "messages", now: Date, monthsAhead: number): Promise<string[]> {
  const ensured: string[] = [];
  for (const partition of eventPartitionsFor(now, monthsAhead)) {
    const name = partition.name.replace("events_", `${table}_`);
    await db.execute(sql.raw(
      `CREATE TABLE IF NOT EXISTS "${name}" PARTITION OF "${table}" FOR VALUES FROM ('${partition.from}') TO ('${partition.to}')`,
    ));
    ensured.push(name);
  }
  return ensured;
}
