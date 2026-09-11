/**
 * End-to-end proof: dev-login provisions a new organization with the five
 * default groups, and whoever created it becomes Owner (docs/adr/0029).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Test } from "@nestjs/testing";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import { ZodValidationPipe } from "nestjs-zod";
import postgres from "postgres";
import { orgId as orgIdFactory, userId as userIdFactory } from "@spark/core";
import { AppModule } from "../src/app.module.js";

const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://postgres:spark_dev@localhost:5432/spark";

const admin = postgres(DATABASE_URL, { prepare: false });
const email = `dev-login-test-${crypto.randomUUID()}@company.com`;

let app: NestFastifyApplication;
let createdOrgId: string;

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  app.useGlobalPipes(new ZodValidationPipe());
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
});

afterAll(async () => {
  await app.close();
  if (createdOrgId) {
    await admin`DELETE FROM user_permission_groups WHERE org_id = ${createdOrgId}`;
    await admin`DELETE FROM permission_groups WHERE org_id = ${createdOrgId}`;
    await admin`DELETE FROM users WHERE org_id = ${createdOrgId}`;
    await admin`DELETE FROM organizations WHERE id = ${createdOrgId}`;
  }
  await admin.end();
});

describe("POST /v1/dev/login — provisions an organization with default groups (docs/adr/0029)", () => {
  it("new email: creates organization, user, five groups, and the user becomes Owner", async () => {
    const res = await app.inject({ method: "POST", url: "/v1/dev/login", payload: { email } });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    createdOrgId = body.orgId;

    const groups = await admin`SELECT name, capabilities FROM permission_groups WHERE org_id = ${body.orgId} ORDER BY name`;
    expect(groups.map((g) => g.name)).toEqual(
      ["Administrador", "Agente", "Gerente", "Proprietário", "Visualizador"],
    );

    const assignment = await admin`
      SELECT pg.name FROM user_permission_groups upg
      JOIN permission_groups pg ON pg.id = upg.group_id
      WHERE upg.user_id = ${body.userId}
    `;
    expect(assignment).toHaveLength(1);
    expect(assignment[0]?.name).toBe("Proprietário");
  });

  it("same email again: reuses the organization and user, doesn't duplicate any group", async () => {
    const res = await app.inject({ method: "POST", url: "/v1/dev/login", payload: { email } });

    expect(res.statusCode).toBe(201);
    expect(res.json().orgId).toBe(createdOrgId);

    const groups = await admin`SELECT id FROM permission_groups WHERE org_id = ${createdOrgId}`;
    expect(groups).toHaveLength(5);
  });

  it("account predating ADR-0029 (organization with no group at all): login self-heals, without duplicating on a second login", async () => {
    const oldEmail = `dev-login-old-account-${crypto.randomUUID()}@company.com`;
    const oldOrg = orgIdFactory.create();
    const oldUser = userIdFactory.create();
    const supabaseUserId = crypto.randomUUID();

    // simulates exactly the state of an account created before
    // seedDefaultGroups existed: organization and user, zero groups.
    await admin`INSERT INTO organizations (id, name, slug) VALUES (${oldOrg}, 'Old Org', ${"old-org-" + oldOrg})`;
    await admin`INSERT INTO users (id, org_id, supabase_user_id, name, email) VALUES
      (${oldUser}, ${oldOrg}, ${supabaseUserId}, 'Old Account', ${oldEmail})`;

    const res = await app.inject({ method: "POST", url: "/v1/dev/login", payload: { email: oldEmail } });
    expect(res.statusCode).toBe(201);
    expect(res.json().orgId).toBe(oldOrg);

    const groups = await admin`SELECT name FROM permission_groups WHERE org_id = ${oldOrg} ORDER BY name`;
    expect(groups.map((g) => g.name)).toEqual(
      ["Administrador", "Agente", "Gerente", "Proprietário", "Visualizador"],
    );

    const assignment = await admin`
      SELECT pg.name FROM user_permission_groups upg
      JOIN permission_groups pg ON pg.id = upg.group_id
      WHERE upg.user_id = ${oldUser}
    `;
    expect(assignment).toHaveLength(1);
    expect(assignment[0]?.name).toBe("Proprietário");

    // logging in again must not duplicate the five groups.
    const secondLoginRes = await app.inject({ method: "POST", url: "/v1/dev/login", payload: { email: oldEmail } });
    expect(secondLoginRes.statusCode).toBe(201);
    const groupsAfter = await admin`SELECT id FROM permission_groups WHERE org_id = ${oldOrg}`;
    expect(groupsAfter).toHaveLength(5);

    await admin`DELETE FROM user_permission_groups WHERE org_id = ${oldOrg}`;
    await admin`DELETE FROM permission_groups WHERE org_id = ${oldOrg}`;
    await admin`DELETE FROM users WHERE org_id = ${oldOrg}`;
    await admin`DELETE FROM organizations WHERE id = ${oldOrg}`;
  });
});
