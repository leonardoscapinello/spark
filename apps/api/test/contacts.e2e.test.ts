/**
 * POST /v1/contacts requires the contacts:write capability (docs/adr/0029)
 * — end-to-end proof that CapabilityGuard denies by default and grants
 * access with the right group, not just the "authenticated user" path
 * that SupabaseJwtGuard already covers on its own.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Test } from "@nestjs/testing";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import { ZodValidationPipe } from "nestjs-zod";
import { SignJWT } from "jose";
import postgres from "postgres";
import { orgId as orgIdFactory, userId as userIdFactory, contactId as contactIdFactory, permissionGroupId as permissionGroupIdFactory } from "@spark/core";
import { AppModule } from "../src/app.module.js";
import { seedPermissionGroup } from "./permissions.js";

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET ?? "dev-only-local-secret-do-not-use-in-production";
const DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgresql://postgres:spark_dev@localhost:5432/spark";

const admin = postgres(DATABASE_URL, { prepare: false });

const org = orgIdFactory.create();
const userWithoutGroup = userIdFactory.create();
const supabaseIdWithoutGroup = crypto.randomUUID();
const userWithGroup = userIdFactory.create();
const supabaseIdWithGroup = crypto.randomUUID();

async function signJwt(sub: string) {
  const key = new TextEncoder().encode(JWT_SECRET);
  return new SignJWT({ role: "authenticated" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(sub)
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(key);
}

let app: NestFastifyApplication;

beforeAll(async () => {
  await admin`INSERT INTO organizations (id, name, slug) VALUES (${org}, 'Capability Org', ${"capability-org-" + org})`;
  await admin`INSERT INTO users (id, org_id, supabase_user_id, name, email) VALUES
    (${userWithoutGroup}, ${org}, ${supabaseIdWithoutGroup}, 'No Group', 'no-group@company.com'),
    (${userWithGroup}, ${org}, ${supabaseIdWithGroup}, 'With Group', 'with-group@company.com')`;

  const group = permissionGroupIdFactory.create();
  await seedPermissionGroup(admin, org, group, "Agente", ["contacts:write"]);
  await admin`INSERT INTO user_permission_groups (org_id, user_id, group_id) VALUES (${org}, ${userWithGroup}, ${group})`;

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  app.useGlobalPipes(new ZodValidationPipe());
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
});

afterAll(async () => {
  await app.close();
  await admin`DELETE FROM contacts WHERE org_id = ${org}`;
  await admin`DELETE FROM user_permission_groups WHERE org_id = ${org}`;
  await admin`DELETE FROM permission_groups WHERE org_id = ${org}`;
  await admin`DELETE FROM users WHERE org_id = ${org}`;
  await admin`DELETE FROM organizations WHERE id = ${org}`;
  await admin.end();
});

describe("POST /v1/contacts — requires contacts:write (docs/adr/0029)", () => {
  it("user with no group at all: 403, not 201 — denies by default", async () => {
    const token = await signJwt(supabaseIdWithoutGroup);
    const res = await app.inject({
      method: "POST",
      url: "/v1/contacts",
      headers: { authorization: `Bearer ${token}` },
      payload: { id: contactIdFactory.create(), name: "Denied Contact" },
    });
    expect(res.statusCode).toBe(403);
  });

  it("user with a group that has contacts:write: 201", async () => {
    const token = await signJwt(supabaseIdWithGroup);
    const res = await app.inject({
      method: "POST",
      url: "/v1/contacts",
      headers: { authorization: `Bearer ${token}` },
      payload: { id: contactIdFactory.create(), name: "Allowed Contact" },
    });
    expect(res.statusCode).toBe(201);
  });
});

describe("PATCH /v1/contacts/:id — edits an existing contact (docs/adr/0029)", () => {
  it("updates only the field sent, preserves the rest", async () => {
    const token = await signJwt(supabaseIdWithGroup);
    const createdId = contactIdFactory.create();
    await app.inject({
      method: "POST",
      url: "/v1/contacts",
      headers: { authorization: `Bearer ${token}` },
      payload: { id: createdId, name: "Original Name", email: "original@company.com" },
    });

    const res = await app.inject({
      method: "PATCH",
      url: `/v1/contacts/${createdId}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { name: "Corrected Name" },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().contact.name).toBe("Corrected Name");
    expect(res.json().contact.email).toBe("original@company.com");
  });

  it("user without contacts:write: 403", async () => {
    const tokenWithGroup = await signJwt(supabaseIdWithGroup);
    const createdId = contactIdFactory.create();
    await app.inject({
      method: "POST",
      url: "/v1/contacts",
      headers: { authorization: `Bearer ${tokenWithGroup}` },
      payload: { id: createdId, name: "Another Contact" },
    });

    const tokenWithoutGroup = await signJwt(supabaseIdWithoutGroup);
    const res = await app.inject({
      method: "PATCH",
      url: `/v1/contacts/${createdId}`,
      headers: { authorization: `Bearer ${tokenWithoutGroup}` },
      payload: { name: "Should not apply" },
    });
    expect(res.statusCode).toBe(403);
  });
});
