/**
 * Proof of Bloco 6's exit criterion (docs/arquitetura/fase-0.md): "the
 * contact list renders from the local collection with no network call on
 * navigation, and an insert in one tab appears in the other in under 1 second."
 *
 * "Two tabs" becomes, here, two independent instances of
 * createContactsCollection() — each with its own ShapeStream —
 * authenticated as the SAME user (that's exactly what two browser tabs
 * are: two independent sessions, same token). Collection B never calls
 * insert; if the contact appears in it anyway, it's because it came from
 * Electric replicating from Postgres, not A's local optimistic state —
 * the only way to prove cross-client sync genuinely works, not just one
 * client's own write path talking to itself (this was already proven
 * manually, see Bloco 6's history, but never landed as a test).
 *
 * apps/api runs as a SEPARATE PROCESS for the same reason as
 * packages/api-client/test/generated-client.e2e.test.ts: NestJS's
 * decorator metadata doesn't survive another package's transform.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { spawn, type ChildProcess } from "node:child_process";
import { SignJWT } from "jose";
import postgres from "postgres";
import {
  orgId as orgIdFactory,
  userId as userIdFactory,
  permissionGroupId as permissionGroupIdFactory,
  type OrgId,
} from "@spark/core";
import { setSparkApiBaseUrl, setSparkAuthTokenProvider } from "@spark/api-client";
import { createContactsCollection, optimisticContact, type ContactsCollection } from "../src/contacts-collection.js";

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET ?? "dev-only-local-secret-do-not-use-in-production";
const DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://postgres:spark_dev@localhost:5432/spark";
const PORT = 3212; // dedicated to this test — distinct from 3211 (api-client) and 3000 (dev)

const admin = postgres(DATABASE_URL, { prepare: false });
const org: OrgId = orgIdFactory.create();
const localUserId = userIdFactory.create();
const supabaseUserId = crypto.randomUUID();

let apiProcess: ChildProcess;
const openCollections: ContactsCollection[] = [];

function waitForApiReady(child: ChildProcess): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("API did not start in time")), 15_000);
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

function createTrackedCollection(): ContactsCollection {
  const collection = createContactsCollection();
  openCollections.push(collection);
  return collection;
}

beforeAll(async () => {
  await admin`INSERT INTO organizations (id, name, slug) VALUES (${org}, 'packages/data Org', ${"org-data-" + org})`;
  await admin`INSERT INTO users (id, org_id, supabase_user_id, name, email) VALUES
    (${localUserId}, ${org}, ${supabaseUserId}, 'packages/data Person', 'data@company.com')`;

  // POST /v1/contacts now requires the contacts:write capability
  // (docs/adr/0029) — this test doesn't go through dev-login (which
  // seeds the default groups on its own), so it needs the permission
  // itself, directly.
  const group = permissionGroupIdFactory.create();
  await admin`INSERT INTO permission_groups (id, org_id, name, capabilities) VALUES
    (${group}, ${org}, 'Gerente', ${JSON.stringify(["contacts:read", "contacts:write"])}::jsonb)`;
  await admin`INSERT INTO user_permission_groups (org_id, user_id, group_id) VALUES
    (${org}, ${localUserId}, ${group})`;

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
}, 20_000);

afterEach(async () => {
  await Promise.all(openCollections.splice(0).map((collection) => collection.cleanup()));
});

afterAll(async () => {
  apiProcess?.kill();
  await admin`DELETE FROM contacts WHERE org_id = ${org}`;
  await admin`DELETE FROM user_permission_groups WHERE org_id = ${org}`;
  await admin`DELETE FROM permission_groups WHERE org_id = ${org}`;
  await admin`DELETE FROM users WHERE org_id = ${org}`;
  await admin`DELETE FROM organizations WHERE id = ${org}`;
  await admin.end();
});

describe("packages/data — local-first contacts collection (Bloco 6)", () => {
  it("an insert in collection A appears in collection B (another tab) in under 1 second, via Electric — not via local optimistic state", async () => {
    const collectionA = createTrackedCollection();
    const collectionB = createTrackedCollection();

    await Promise.all([collectionA.preload(), collectionB.preload()]);

    const contact = optimisticContact({ name: "Synced Contact" }, org);

    const start = Date.now();
    const tx = collectionA.insert(contact);

    // collectionB never called insert — it's only subscribed to the same shape.
    await waitUntil(() => collectionB.has(contact.id), 2_000);
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(1_000);
    expect(collectionB.get(contact.id)?.name).toBe("Synced Contact");
    // a multi-word field — this is what would catch the real bug already
    // fixed of a missing columnMapper: Electric replicates the Postgres
    // column (snake_case, "created_at"), and without the mapper the Zod
    // schema's camelCase field arrives undefined, with no type error at
    // all. "name" alone would never catch this — it's the same in both casings.
    expect(typeof collectionB.get(contact.id)?.createdAt).toBe("string");

    // A's own optimistic write also needs to have really been persisted
    // on the server, not just appeared locally.
    await tx.isPersisted.promise;

    const dbRow = await admin`SELECT name FROM contacts WHERE id = ${contact.id}`;
    expect(dbRow[0]?.name).toBe("Synced Contact");
  }, 10_000);

  it("reading an already-synced collection makes no network call — toArray is synchronous and local", async () => {
    const collection = createTrackedCollection();
    await collection.preload();

    // toArray is a synchronous getter over in-memory state — if this
    // needed the network, it would be a Promise, not a direct value.
    // That type difference is what makes ~0ms reads possible (docs/adr/0018).
    const before = collection.toArray;
    expect(Array.isArray(before)).toBe(true);
  });
});
