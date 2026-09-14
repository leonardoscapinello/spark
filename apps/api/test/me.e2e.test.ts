/**
 * End-to-end proof for Bloco 5 (docs/arquitetura/fase-0.md): "login works
 * end to end" — here, verifying a JWT in Supabase Auth's own format and
 * resolving it to the right local user, via real HTTP (app.inject, no
 * need to open a network port — faster and more reliable in CI).
 *
 * There's no real Supabase project available in this environment — what
 * IS verifiable, and what matters to verify, is the MECHANICS: a JWT
 * signed with the configured SUPABASE_JWT_SECRET is accepted; one signed
 * with the wrong secret isn't. Swapping the dev secret for a real
 * production one is configuration, not a code change.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Test } from "@nestjs/testing";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import { ZodValidationPipe } from "nestjs-zod";
import { SignJWT } from "jose";
import postgres from "postgres";
import { orgId as orgIdFactory, userId as userIdFactory } from "@spark/core";
import { AppModule } from "../src/app.module.js";

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET ?? "dev-only-local-secret-do-not-use-in-production";
const DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgresql://postgres:spark_dev@localhost:5432/spark";

const admin = postgres(DATABASE_URL, { prepare: false });

const org = orgIdFactory.create();
const localUserId = userIdFactory.create();
const provisionedSupabaseUserId = crypto.randomUUID();
const unprovisionedSupabaseUserId = crypto.randomUUID();

async function signJwt(sub: string, secret = JWT_SECRET) {
  const key = new TextEncoder().encode(secret);
  return new SignJWT({ email: "person@company.com", role: "authenticated" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(sub)
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(key);
}

let app: NestFastifyApplication;

beforeAll(async () => {
  await admin`INSERT INTO organizations (id, name, slug) VALUES (${org}, 'Test Org', ${"test-org-" + org})`;
  await admin`INSERT INTO users (id, org_id, supabase_user_id, name, email) VALUES
    (${localUserId}, ${org}, ${provisionedSupabaseUserId}, 'Test Person', 'person@company.com')`;

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  app.useGlobalPipes(new ZodValidationPipe());
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
});

afterAll(async () => {
  await app.close();
  await admin`DELETE FROM users WHERE org_id = ${org}`;
  await admin`DELETE FROM organizations WHERE id = ${org}`;
  await admin.end();
});

describe("GET /v1/me — end-to-end login (docs/arquitetura/fase-0.md, Bloco 5)", () => {
  it("without Authorization, 401", async () => {
    const res = await app.inject({ method: "GET", url: "/v1/me" });
    expect(res.statusCode).toBe(401);
  });

  it("with a JWT signed with the wrong secret, 401 — doesn't accept just any token", async () => {
    const token = await signJwt(provisionedSupabaseUserId, "wrong-secret");
    const res = await app.inject({
      method: "GET",
      url: "/v1/me",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(401);
  });

  it("with a valid JWT for a user with no local provisioning, 404", async () => {
    const token = await signJwt(unprovisionedSupabaseUserId);
    const res = await app.inject({
      method: "GET",
      url: "/v1/me",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(404);
  });

  it("with a valid JWT for a provisioned user, 200 and the right profile", async () => {
    const token = await signJwt(provisionedSupabaseUserId);
    const res = await app.inject({
      method: "GET",
      url: "/v1/me",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.id).toBe(localUserId);
    expect(body.orgId).toBe(org);
    expect(body.name).toBe("Test Person");
    expect(body.email).toBe("person@company.com");
    // deactivatedAt needs to be present and null — not "missing" —
    // because the Zod schema (single source, ADR-0019) declares it
    // nullable, not optional.
    expect(body).toHaveProperty("deactivatedAt", null);
  });
});
