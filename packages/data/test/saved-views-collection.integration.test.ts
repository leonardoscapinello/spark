/**
 * Isolated reproduction of the "stuck on loading forever" symptom observed
 * in the dev browser for the saved_views collection — every other
 * collection (contacts, custom fields...) settles; this one didn't, even
 * after a clean recreate of the Electric container. This test rules out
 * (or confirms) that it's a bug in the collection/shape wiring itself,
 * isolated from the long-lived dev session's accumulated state: fresh API
 * process, fresh org, fresh Electric shape, same pattern as
 * contacts-collection.integration.test.ts (Bloco 6's proof).
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { spawn, type ChildProcess } from "node:child_process";
import { SignJWT } from "jose";
import postgres from "postgres";
import { orgId as orgIdFactory, userId as userIdFactory, permissionGroupId as permissionGroupIdFactory, type OrgId } from "@spark/core";
import { setSparkApiBaseUrl, setSparkAuthTokenProvider } from "@spark/api-client";
import { createSavedViewsCollection, optimisticSavedView, type SavedViewsCollection } from "../src/saved-views-collection.js";

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET ?? "dev-only-local-secret-do-not-use-in-production";
const DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgresql://postgres:spark_dev@localhost:5432/spark";
// O Electric dos testes é o do Docker local — o do app aponta para o banco real (docs/operacao/ambientes.md).
const TEST_ELECTRIC_URL = process.env.TEST_ELECTRIC_URL ?? "http://localhost:3010";
const PORT = 3214; // distinct from 3211 (api-client), 3212 (contacts), 3213 (deals), 3000 (dev)

const admin = postgres(DATABASE_URL, { prepare: false });
const org: OrgId = orgIdFactory.create();
const localUserId = userIdFactory.create();
const supabaseUserId = crypto.randomUUID();

let apiProcess: ChildProcess;
const openCollections: SavedViewsCollection[] = [];

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
    if (Date.now() - start > timeoutMs) {
      throw new Error(`timeout (${timeoutMs}ms) waiting on condition`);
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

function createTrackedCollection(): SavedViewsCollection {
  const collection = createSavedViewsCollection();
  openCollections.push(collection);
  return collection;
}

beforeAll(async () => {
  await admin`INSERT INTO organizations (id, name, slug) VALUES (${org}, 'saved-views test org', ${"org-views-" + org})`;
  await admin`INSERT INTO users (id, org_id, supabase_user_id, name, email) VALUES
    (${localUserId}, ${org}, ${supabaseUserId}, 'Views Person', 'views@company.com')`;

  const group = permissionGroupIdFactory.create();
  await admin`INSERT INTO permission_groups (id, org_id, name, capabilities) VALUES
    (${group}, ${org}, 'Gerente', ${JSON.stringify(["contacts:read", "contacts:write"])}::jsonb)`;
  await admin`INSERT INTO user_permission_groups (org_id, user_id, group_id) VALUES
    (${org}, ${localUserId}, ${group})`;

  apiProcess = spawn("node", ["--loader", "ts-node/esm", "src/main.ts"], {
    cwd: new URL("../../../apps/api", import.meta.url).pathname,
    env: { ...process.env, PORT: String(PORT), DATABASE_URL, ELECTRIC_URL: TEST_ELECTRIC_URL, SUPABASE_JWT_SECRET: JWT_SECRET, NODE_ENV: "test", TS_NODE_TRANSPILE_ONLY: "true" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  await waitForApiReady(apiProcess);

  setSparkApiBaseUrl(`http://127.0.0.1:${PORT}`);

  const key = new TextEncoder().encode(JWT_SECRET);
  const token = await new SignJWT({}).setProtectedHeader({ alg: "HS256" }).setSubject(supabaseUserId).setIssuedAt().setExpirationTime("1h").sign(key);
  setSparkAuthTokenProvider(() => token);
}, 60_000);

afterEach(async () => {
  await Promise.all(openCollections.splice(0).map((collection) => collection.cleanup()));
});

afterAll(async () => {
  apiProcess?.kill();
  await admin`DELETE FROM saved_views WHERE org_id = ${org}`;
  await admin`DELETE FROM user_permission_groups WHERE org_id = ${org}`;
  await admin`DELETE FROM permission_groups WHERE org_id = ${org}`;
  await admin`DELETE FROM users WHERE org_id = ${org}`;
  await admin`DELETE FROM organizations WHERE id = ${org}`;
  await admin.end();
});

describe("packages/data — saved views collection", () => {
  it("an insert appears back in a second, independent collection subscribed to the same shape", async () => {
    const collectionA = createTrackedCollection();
    const collectionB = createTrackedCollection();

    await Promise.all([collectionA.preload(), collectionB.preload()]);

    const view = optimisticSavedView({ name: "Qualificados", entityType: "contact", filters: "leadStatus:is:qualified", visibility: "org" }, org, localUserId);

    const start = Date.now();
    const tx = collectionA.insert(view);

    await waitUntil(() => collectionB.has(view.id), 5_000);
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(2_000);
    expect(collectionB.get(view.id)?.name).toBe("Qualificados");
    expect(collectionB.get(view.id)?.filters).toBe("leadStatus:is:qualified");

    await tx.isPersisted.promise;

    const dbRow = await admin`SELECT name, filters FROM saved_views WHERE id = ${view.id}`;
    expect(dbRow[0]?.name).toBe("Qualificados");
  }, 10_000);
});
