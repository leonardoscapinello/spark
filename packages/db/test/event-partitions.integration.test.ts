/**
 * Prova de que a manutenção de partições de events funciona contra o
 * Postgres de verdade: a rotina cria os meses que faltam, uma linha do mês
 * novo cai na partição certa, e uma linha fora de qualquer horizonte cai na
 * DEFAULT (migration 0028) em vez de derrubar a transação.
 *
 * Precisa do Postgres local com as migrations aplicadas — CI faz os dois.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import postgres from "postgres";
import { orgId as orgIdFactory, eventId as eventIdFactory } from "@spark/core";
import { createDbClient, ensureEventPartitions } from "../src/index.js";

const DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://postgres:spark_dev@localhost:5432/spark";
const admin = postgres(DATABASE_URL, { prepare: false });
const db = createDbClient(DATABASE_URL);
const org = orgIdFactory.create();

// Um ano longe do presente e do horizonte do scheduler, para o teste nunca
// colidir com partições que a rotina de verdade já criou.
const FUTURE = new Date("2031-06-15T00:00:00Z");
const created = ["events_y2031m06", "events_y2031m07"];

beforeAll(async () => {
  await admin`INSERT INTO organizations (id, name, slug) VALUES (${org}, 'Partition Org', ${"org-part-" + org})`;
});

afterAll(async () => {
  await admin`DELETE FROM events WHERE org_id = ${org}`;
  for (const name of created) await admin.unsafe(`DROP TABLE IF EXISTS "${name}"`);
  await admin`DELETE FROM organizations WHERE id = ${org}`;
  await admin.end();
});

describe("packages/db — partições mensais de events", () => {
  it("cria as partições que faltam, e rodar de novo não muda nada", async () => {
    const first = await ensureEventPartitions(db, FUTURE, 1);
    expect(first).toEqual(created);
    const rows = await admin<{ name: string }[]>`
      SELECT c.relname AS name FROM pg_inherits i
      JOIN pg_class c ON c.oid = i.inhrelid
      JOIN pg_class p ON p.oid = i.inhparent
      WHERE p.relname = 'events' AND c.relname = ANY(${created})`;
    expect(rows.map((row) => row.name).sort()).toEqual([...created].sort());

    await expect(ensureEventPartitions(db, FUTURE, 1)).resolves.toEqual(created);
  });

  it("uma linha do mês novo cai na partição do mês, não na DEFAULT", async () => {
    const id = eventIdFactory.create();
    await admin`INSERT INTO events (id, org_id, type, occurred_at) VALUES (${id}, ${org}, 'contact.created', '2031-06-10T10:00:00Z')`;
    const [row] = await admin<{ partition: string }[]>`SELECT tableoid::regclass::text AS partition FROM events WHERE id = ${id}`;
    expect(row?.partition).toBe("events_y2031m06");
  });

  it("uma linha fora de qualquer partição cai na DEFAULT em vez de falhar", async () => {
    const id = eventIdFactory.create();
    await admin`INSERT INTO events (id, org_id, type, occurred_at) VALUES (${id}, ${org}, 'contact.created', '2040-01-01T00:00:00Z')`;
    const [row] = await admin<{ partition: string }[]>`SELECT tableoid::regclass::text AS partition FROM events WHERE id = ${id}`;
    expect(row?.partition).toBe("events_default");
  });
});
