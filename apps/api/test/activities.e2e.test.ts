/**
 * End-to-end activity (roadmap.md, Fase 1): create linked to a contact,
 * complete, reopen — each route requiring activities:write
 * (docs/adr/0029), never just "authenticated".
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Test } from "@nestjs/testing";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import { ZodValidationPipe } from "nestjs-zod";
import { SignJWT } from "jose";
import postgres from "postgres";
import {
  orgId as orgIdFactory,
  userId as userIdFactory,
  contactId as contactIdFactory,
  activityId as activityIdFactory,
  permissionGroupId as permissionGroupIdFactory,
} from "@spark/core";
import { AppModule } from "../src/app.module.js";

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET ?? "dev-only-local-secret-do-not-use-in-production";
const DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://postgres:spark_dev@localhost:5432/spark";

const admin = postgres(DATABASE_URL, { prepare: false });

const org = orgIdFactory.create();
const manager = userIdFactory.create();
const supabaseIdManager = crypto.randomUUID();
const viewer = userIdFactory.create();
const supabaseIdViewer = crypto.randomUUID();
const contact = contactIdFactory.create();

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
  await admin`INSERT INTO organizations (id, name, slug) VALUES (${org}, 'Activities Org', ${"activities-org-" + org})`;
  await admin`INSERT INTO users (id, org_id, supabase_user_id, name, email) VALUES
    (${manager}, ${org}, ${supabaseIdManager}, 'Manager', 'manager@company.com'),
    (${viewer}, ${org}, ${supabaseIdViewer}, 'Viewer', 'viewer@company.com')`;

  const managerGroup = permissionGroupIdFactory.create();
  const viewerGroup = permissionGroupIdFactory.create();
  await admin`INSERT INTO permission_groups (id, org_id, name, capabilities) VALUES
    (${managerGroup}, ${org}, 'Gerente', ${JSON.stringify(["contacts:write", "activities:read", "activities:write"])}::jsonb),
    (${viewerGroup}, ${org}, 'Visualizador', ${JSON.stringify(["activities:read"])}::jsonb)`;
  await admin`INSERT INTO user_permission_groups (org_id, user_id, group_id) VALUES
    (${org}, ${manager}, ${managerGroup}),
    (${org}, ${viewer}, ${viewerGroup})`;

  await admin`INSERT INTO contacts (id, org_id, name) VALUES (${contact}, ${org}, 'Test Contact')`;

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  app.useGlobalPipes(new ZodValidationPipe());
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
});

afterAll(async () => {
  await app.close();
  await admin`DELETE FROM activities WHERE org_id = ${org}`;
  await admin`DELETE FROM contacts WHERE org_id = ${org}`;
  await admin`DELETE FROM user_permission_groups WHERE org_id = ${org}`;
  await admin`DELETE FROM permission_groups WHERE org_id = ${org}`;
  await admin`DELETE FROM users WHERE org_id = ${org}`;
  await admin`DELETE FROM organizations WHERE id = ${org}`;
  await admin.end();
});

describe("End-to-end activity — create linked to a contact, complete, reopen (docs/adr/0029)", () => {
  it("Viewer (no activities:write) can't create an activity: 403", async () => {
    const token = await signJwt(supabaseIdViewer);
    const res = await app.inject({
      method: "POST",
      url: "/v1/activities",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        id: activityIdFactory.create(),
        contactId: contact,
        type: "call",
        title: "Call to negotiate",
        scheduledAt: new Date().toISOString(),
      },
    });
    expect(res.statusCode).toBe(403);
  });

  it("Manager creates an activity linked to a contact, completes it, and reopens it", async () => {
    const token = await signJwt(supabaseIdManager);
    const activityIdValue = activityIdFactory.create();

    const createRes = await app.inject({
      method: "POST",
      url: "/v1/activities",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        id: activityIdValue,
        contactId: contact,
        type: "call",
        title: "Call to negotiate",
        scheduledAt: "2026-09-15T14:00:00.000Z",
      },
    });
    expect(createRes.statusCode).toBe(201);
    const createBody = createRes.json();
    expect(createBody.activity.title).toBe("Call to negotiate");
    expect(createBody.activity.type).toBe("call");
    expect(createBody.activity.contactId).toBe(contact);
    expect(createBody.activity.completed).toBe(false);
    expect(createBody.activity.completedAt).toBeNull();
    expect(typeof createBody.txid).toBe("number");

    const completeRes = await app.inject({
      method: "PATCH",
      url: `/v1/activities/${activityIdValue}/complete`,
      headers: { authorization: `Bearer ${token}` },
      payload: { completed: true },
    });
    expect(completeRes.statusCode).toBe(200);
    expect(completeRes.json().activity.completed).toBe(true);
    expect(completeRes.json().activity.completedAt).not.toBeNull();

    const reopenRes = await app.inject({
      method: "PATCH",
      url: `/v1/activities/${activityIdValue}/complete`,
      headers: { authorization: `Bearer ${token}` },
      payload: { completed: false },
    });
    expect(reopenRes.statusCode).toBe(200);
    expect(reopenRes.json().activity.completed).toBe(false);
    expect(reopenRes.json().activity.completedAt).toBeNull();
  });
});
