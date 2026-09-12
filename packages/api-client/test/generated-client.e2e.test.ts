/**
 * The final proof for Bloco 5 (docs/arquitetura/fase-0.md): "the generated
 * client types the response with no hand-written DTO". Spins up apps/api
 * as a genuinely SEPARATE PROCESS (not imported in-memory) — that's how
 * any real app (web/desktop/mobile) talks to the API, and it's the only
 * reliable way to test this: importing main.ts from inside another
 * package's Vitest process doesn't preserve the decorator metadata
 * NestJS's DI needs (each package has its own TS/esbuild transform — see
 * this change's commit and apps/api/package.json, which runs via
 * ts-node, not tsx/esbuild, for the same reason).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { spawn, type ChildProcess } from "node:child_process";
import { SignJWT } from "jose";
import postgres from "postgres";
import { UserSchema, orgId as orgIdFactory, userId as userIdFactory } from "@spark/core";
import { meControllerMe, type UserDto } from "../src/generated.js";
import { setSparkApiBaseUrl, setSparkAuthTokenProvider } from "../src/http-client.js";

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET ?? "dev-only-local-secret-do-not-use-in-production";
const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://postgres:spark_dev@localhost:5432/spark";
const PORT = 3211; // fixed port dedicated to this test — not the dev one (3000)

const admin = postgres(DATABASE_URL, { prepare: false });
const org = orgIdFactory.create();
const localUserId = userIdFactory.create();
const supabaseUserId = crypto.randomUUID();

let apiProcess: ChildProcess;

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

beforeAll(async () => {
  await admin`INSERT INTO organizations (id, name, slug) VALUES (${org}, 'Generated Client Org', ${"org-client-" + org})`;
  await admin`INSERT INTO users (id, org_id, supabase_user_id, name, email) VALUES
    (${localUserId}, ${org}, ${supabaseUserId}, 'Person Via Generated Client', 'generated@company.com')`;

  apiProcess = spawn("node", ["--loader", "ts-node/esm", "src/main.ts"], {
    cwd: new URL("../../../apps/api", import.meta.url).pathname,
    env: {
      ...process.env,
      PORT: String(PORT),
      DATABASE_URL,
      SUPABASE_JWT_SECRET: JWT_SECRET,
      NODE_ENV: "test",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  await waitForApiReady(apiProcess);
  setSparkApiBaseUrl(`http://127.0.0.1:${PORT}`);
}, 60_000);

afterAll(async () => {
  apiProcess?.kill();
  await admin`DELETE FROM users WHERE org_id = ${org}`;
  await admin`DELETE FROM organizations WHERE id = ${org}`;
  await admin.end();
});

async function validJwt(): Promise<string> {
  const key = new TextEncoder().encode(JWT_SECRET);
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(supabaseUserId)
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(key);
}

describe("generated client (orval) — packages/api-client never hand-declares UserDto", () => {
  it("meControllerMe() calls the real API (separate process) and returns the typed profile", async () => {
    const token = await validJwt();
    setSparkAuthTokenProvider(() => token);

    const profile: UserDto = await meControllerMe();

    expect(profile.id).toBe(localUserId);
    expect(profile.orgId).toBe(org);
    expect(profile.name).toBe("Person Via Generated Client");
    expect(profile.email).toBe("generated@company.com");

    // UserDto (from OpenAPI) has id/orgId as plain strings — JSON Schema
    // can't express a branded type (UserId, OrgId). That's not a bug: it's
    // the real limit of any OpenAPI-based codegen. The right bridge is NOT
    // a structural cast — it's revalidating through the SAME Zod source
    // that already defines the brand (docs/adr/0004, docs/adr/0019). If
    // UserDto and UserSchema ever diverged in shape, this would throw at
    // runtime, not silently pass.
    const branded = UserSchema.parse(profile);
    expect(branded.supabaseUserId).toBe(supabaseUserId);
  });
});
