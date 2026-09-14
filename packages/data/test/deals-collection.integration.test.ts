/**
 * Proof of the real bug found testing the CRM board in the browser (not
 * just the compiler): `useLiveQuery` returns the synced row exactly as
 * Electric sends it — without going through Zod's transform. `amount`
 * arrives as the Postgres column has it (bigint), not as `Money`.
 * `syncedAmount` is the only point that converts it back; this test
 * proves the value survives the full cycle (insert → Electric → another
 * collection → Money).
 *
 * Pipeline and stage are fixtures, seeded directly via SQL (like
 * organization/user/group below) — only the deal goes through the
 * local-first collection, which is the only thing this test needs to
 * prove. Routing all three (pipeline, stage, deal) through the
 * collection, each waiting on its own `isPersisted.promise`, proved
 * unstable in this environment (timeout waiting on the PIPELINE's txId,
 * not the deal's) — likely the cost of materializing two new shapes
 * (pipelines, stages) from scratch in the same window another test
 * process (contacts) already occupies the local Electric instance.
 * Reducing the fixture to direct SQL removes that noise without giving
 * up what the test exists to prove.
 *
 * Same apps/api spawn pattern as contacts-collection.integration.test.ts.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { spawn, type ChildProcess } from "node:child_process";
import { SignJWT } from "jose";
import postgres from "postgres";
import {
  orgId as orgIdFactory,
  userId as userIdFactory,
  permissionGroupId as permissionGroupIdFactory,
  pipelineId as pipelineIdFactory,
  stageId as stageIdFactory,
  toCents,
  money,
  type OrgId,
  type PipelineId,
  type StageId,
} from "@spark/core";
import { setSparkApiBaseUrl, setSparkAuthTokenProvider } from "@spark/api-client";
import {
  createDealsCollection,
  optimisticDeal,
  forInsert,
  syncedAmount,
  type DealsCollection,
} from "../src/deals-collection.js";

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET ?? "dev-only-local-secret-do-not-use-in-production";
const DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgresql://postgres:spark_dev@localhost:5432/spark";
const PORT = 3213; // dedicated to this test — distinct from 3211/3212/3000

const admin = postgres(DATABASE_URL, { prepare: false });
const org: OrgId = orgIdFactory.create();
const localUserId = userIdFactory.create();
const supabaseUserId = crypto.randomUUID();
const pipeline: PipelineId = pipelineIdFactory.create();
const stage: StageId = stageIdFactory.create();

let apiProcess: ChildProcess;
const openCollections: DealsCollection[] = [];

function waitForApiReady(child: ChildProcess): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("API did not start in time")), 45_000);
    child.stdout?.on("data", (chunk: Buffer) => {
      if (chunk.toString().includes("listening on")) {
        clearTimeout(timeout);
        resolve();
      }
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code !== 0) reject(new Error(`apps/api exited with code ${code}`));
    });
  });
}

async function waitUntil(condition: () => boolean, timeoutMs: number, intervalMs = 20): Promise<void> {
  const start = Date.now();
  while (!condition()) {
    if (Date.now() - start > timeoutMs) throw new Error(`timeout (${timeoutMs}ms) waiting on condition`);
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

beforeAll(async () => {
  await admin`INSERT INTO organizations (id, name, slug) VALUES (${org}, 'Deals Collection Org', ${"org-deals-" + org})`;
  await admin`INSERT INTO users (id, org_id, supabase_user_id, name, email) VALUES
    (${localUserId}, ${org}, ${supabaseUserId}, 'Deals Collection Person', 'deals-collection@company.com')`;

  const group = permissionGroupIdFactory.create();
  await admin`INSERT INTO permission_groups (id, org_id, name, capabilities) VALUES
    (${group}, ${org}, 'Gerente', ${JSON.stringify(["deals:read", "deals:write", "deals:move"])}::jsonb)`;
  await admin`INSERT INTO user_permission_groups (org_id, user_id, group_id) VALUES (${org}, ${localUserId}, ${group})`;

  await admin`INSERT INTO pipelines (id, org_id, name, is_default) VALUES (${pipeline}, ${org}, 'Test Funnel', true)`;
  await admin`INSERT INTO stages (id, org_id, pipeline_id, name, sort_order) VALUES (${stage}, ${org}, ${pipeline}, 'New', 0)`;

  apiProcess = spawn("node", ["--loader", "ts-node/esm", "src/main.ts"], {
    cwd: new URL("../../../apps/api", import.meta.url).pathname,
    env: {
      ...process.env,
      PORT: String(PORT),
      DATABASE_URL,
      SUPABASE_JWT_SECRET: JWT_SECRET,
      NODE_ENV: "test",
      TS_NODE_TRANSPILE_ONLY: "true",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  await waitForApiReady(apiProcess);

  setSparkApiBaseUrl(`http://127.0.0.1:${PORT}`);
  const key = new TextEncoder().encode(JWT_SECRET);
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(supabaseUserId)
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(key);
  setSparkAuthTokenProvider(() => token);
}, 60_000);

afterEach(async () => {
  await Promise.all(openCollections.splice(0).map((c) => c.cleanup()));
});

afterAll(async () => {
  apiProcess?.kill();
  await admin`DELETE FROM deals WHERE org_id = ${org}`;
  await admin`DELETE FROM stages WHERE org_id = ${org}`;
  await admin`DELETE FROM pipelines WHERE org_id = ${org}`;
  await admin`DELETE FROM user_permission_groups WHERE org_id = ${org}`;
  await admin`DELETE FROM permission_groups WHERE org_id = ${org}`;
  await admin`DELETE FROM users WHERE org_id = ${org}`;
  await admin`DELETE FROM organizations WHERE id = ${org}`;
  await admin.end();
});

describe("packages/data — Money survives the full sync cycle (Fase 1)", () => {
  it("an amount inserted in one collection arrives correct in another, via syncedAmount()", async () => {
    const dealsA: DealsCollection = createDealsCollection();
    const dealsB: DealsCollection = createDealsCollection();
    openCollections.push(dealsA, dealsB);
    await Promise.all([dealsA.preload(), dealsB.preload()]);

    const deal = optimisticDeal(
      { pipelineId: pipeline, stageId: stage, name: "Test Deal", amount: money(150_000) },
      org,
    );
    dealsA.insert(forInsert(deal));

    // dealsB never called insert — it's only subscribed to the same shape.
    // If the amount arrives here, it came from Electric replicating from Postgres.
    await waitUntil(() => dealsB.has(deal.id), 2_000);

    const read = dealsB.get(deal.id);
    expect(read).toBeDefined();
    expect(toCents(syncedAmount(read?.amount))).toBe(150_000);

    const dbRow = await admin`SELECT amount FROM deals WHERE id = ${deal.id}`;
    expect(Number(dbRow[0]?.amount)).toBe(150_000);
  }, 10_000);
});
