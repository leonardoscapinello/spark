/**
 * End-to-end CRM flow (roadmap.md, Fase 1): create pipeline, create
 * stage, create deal, move deal — each route requiring the right
 * capability (docs/adr/0029), never just "authenticated".
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
  pipelineId as pipelineIdFactory,
  stageId as stageIdFactory,
  dealId as dealIdFactory,
  permissionGroupId as permissionGroupIdFactory,
} from "@spark/core";
import { AppModule } from "../src/app.module.js";

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET ?? "dev-only-local-secret-do-not-use-in-production";
const DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgresql://postgres:spark_dev@localhost:5432/spark";

const admin = postgres(DATABASE_URL, { prepare: false });

const org = orgIdFactory.create();
const manager = userIdFactory.create();
const supabaseIdManager = crypto.randomUUID();
const agent = userIdFactory.create();
const supabaseIdAgent = crypto.randomUUID();
const viewer = userIdFactory.create();
const supabaseIdViewer = crypto.randomUUID();

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
  await admin`INSERT INTO organizations (id, name, slug) VALUES (${org}, 'CRM Org', ${"crm-org-" + org})`;
  await admin`INSERT INTO users (id, org_id, supabase_user_id, name, email) VALUES
    (${manager}, ${org}, ${supabaseIdManager}, 'Manager', 'manager@company.com'),
    (${agent}, ${org}, ${supabaseIdAgent}, 'Agent', 'agent@company.com'),
    (${viewer}, ${org}, ${supabaseIdViewer}, 'Viewer', 'viewer@company.com')`;

  const managerGroup = permissionGroupIdFactory.create();
  const agentGroup = permissionGroupIdFactory.create();
  const viewerGroup = permissionGroupIdFactory.create();
  await admin`INSERT INTO permission_groups (id, org_id, name, capabilities) VALUES
    (${managerGroup}, ${org}, 'Gerente', ${admin.json(["pipelines:manage", "deals:read", "deals:write", "deals:move"])}),
    (${agentGroup}, ${org}, 'Agente', ${admin.json(["deals:read", "deals:write", "deals:move"])}),
    (${viewerGroup}, ${org}, 'Visualizador', ${admin.json(["deals:read"])})`;
  await admin`INSERT INTO user_permission_groups (org_id, user_id, group_id) VALUES
    (${org}, ${manager}, ${managerGroup}),
    (${org}, ${agent}, ${agentGroup}),
    (${org}, ${viewer}, ${viewerGroup})`;

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  app.useGlobalPipes(new ZodValidationPipe());
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
});

afterAll(async () => {
  await app.close();
  await admin`DELETE FROM deals WHERE org_id = ${org}`;
  await admin`DELETE FROM stages WHERE org_id = ${org}`;
  await admin`DELETE FROM pipelines WHERE org_id = ${org}`;
  await admin`DELETE FROM user_permission_groups WHERE org_id = ${org}`;
  await admin`DELETE FROM permission_groups WHERE org_id = ${org}`;
  await admin`DELETE FROM users WHERE org_id = ${org}`;
  await admin`DELETE FROM organizations WHERE id = ${org}`;
  await admin.end();
});

describe("End-to-end CRM — pipeline → stage → deal → move (docs/adr/0029)", () => {
  it("Agent (no pipelines:manage) can't create a pipeline: 403", async () => {
    const token = await signJwt(supabaseIdAgent);
    const res = await app.inject({
      method: "POST",
      url: "/v1/pipelines",
      headers: { authorization: `Bearer ${token}` },
      payload: { id: pipelineIdFactory.create(), name: "Denied Funnel" },
    });
    expect(res.statusCode).toBe(403);
  });

  it("Manager creates a pipeline, a stage, a deal, and moves the deal between stages", async () => {
    const managerToken = await signJwt(supabaseIdManager);

    const pipelineRes = await app.inject({
      method: "POST",
      url: "/v1/pipelines",
      headers: { authorization: `Bearer ${managerToken}` },
      payload: { id: pipelineIdFactory.create(), name: "Sales Funnel" },
    });
    expect(pipelineRes.statusCode).toBe(201);
    const pipelineId = pipelineRes.json().pipeline.id;

    const stageAId = stageIdFactory.create();
    const stageBId = stageIdFactory.create();
    const stageARes = await app.inject({
      method: "POST",
      url: "/v1/stages",
      headers: { authorization: `Bearer ${managerToken}` },
      payload: { id: stageAId, pipelineId, name: "Qualification", sortOrder: 0 },
    });
    expect(stageARes.statusCode).toBe(201);

    const stageBRes = await app.inject({
      method: "POST",
      url: "/v1/stages",
      headers: { authorization: `Bearer ${managerToken}` },
      payload: { id: stageBId, pipelineId, name: "Negotiation", sortOrder: 1 },
    });
    expect(stageBRes.statusCode).toBe(201);

    const createdDealId = dealIdFactory.create();
    const dealRes = await app.inject({
      method: "POST",
      url: "/v1/deals",
      headers: { authorization: `Bearer ${managerToken}` },
      payload: { id: createdDealId, pipelineId, stageId: stageAId, name: "Test Deal", amount: 150000 },
    });
    expect(dealRes.statusCode).toBe(201);
    const dealBody = dealRes.json();
    // proof of the real bug fixed: Money is a Symbol-keyed opaque object —
    // if the response didn't convert it back, "amount" would turn into {} in the JSON.
    expect(dealBody.deal.amount).toBe(150000);
    expect(dealBody.deal.stageId).toBe(stageAId);
    expect(typeof dealBody.txid).toBe("number");

    const moveRes = await app.inject({
      method: "PATCH",
      url: `/v1/deals/${createdDealId}/move`,
      headers: { authorization: `Bearer ${managerToken}` },
      payload: { stageId: stageBId },
    });
    expect(moveRes.statusCode).toBe(200);
    expect(moveRes.json().deal.stageId).toBe(stageBId);
    expect(moveRes.json().deal.amount).toBe(150000);

    const renameRes = await app.inject({
      method: "PATCH",
      url: `/v1/stages/${stageAId}/rename`,
      headers: { authorization: `Bearer ${managerToken}` },
      payload: { name: "Qualification Renamed" },
    });
    expect(renameRes.statusCode).toBe(200);
    expect(renameRes.json().stage.name).toBe("Qualification Renamed");

    const agentRenameRes = await app.inject({
      method: "PATCH",
      url: `/v1/stages/${stageBId}/rename`,
      headers: { authorization: `Bearer ${await signJwt(supabaseIdAgent)}` },
      payload: { name: "Should not apply" },
    });
    expect(agentRenameRes.statusCode).toBe(403);
  });

  it("Manager closes one deal as won, and another as lost with a reason", async () => {
    const managerToken = await signJwt(supabaseIdManager);

    const pipelineRes = await app.inject({
      method: "POST",
      url: "/v1/pipelines",
      headers: { authorization: `Bearer ${managerToken}` },
      payload: { id: pipelineIdFactory.create(), name: "Closing Funnel" },
    });
    const pipelineId = pipelineRes.json().pipeline.id;

    const stageId = stageIdFactory.create();
    await app.inject({
      method: "POST",
      url: "/v1/stages",
      headers: { authorization: `Bearer ${managerToken}` },
      payload: { id: stageId, pipelineId, name: "Negotiation", sortOrder: 0 },
    });

    async function createDeal(name: string) {
      const id = dealIdFactory.create();
      await app.inject({
        method: "POST",
        url: "/v1/deals",
        headers: { authorization: `Bearer ${managerToken}` },
        payload: { id, pipelineId, stageId, name, amount: 100000 },
      });
      return id;
    }

    const wonDeal = await createDeal("Won Deal");
    const wonRes = await app.inject({
      method: "PATCH",
      url: `/v1/deals/${wonDeal}/close`,
      headers: { authorization: `Bearer ${managerToken}` },
      payload: { status: "won" },
    });
    expect(wonRes.statusCode).toBe(200);
    expect(wonRes.json().deal.status).toBe("won");
    expect(wonRes.json().deal.lossReason).toBeNull();

    const lostDeal = await createDeal("Lost Deal");
    const lostRes = await app.inject({
      method: "PATCH",
      url: `/v1/deals/${lostDeal}/close`,
      headers: { authorization: `Bearer ${managerToken}` },
      payload: { status: "lost", lossReason: "Price above the customer's budget" },
    });
    expect(lostRes.statusCode).toBe(200);
    expect(lostRes.json().deal.status).toBe("lost");
    expect(lostRes.json().deal.lossReason).toBe("Price above the customer's budget");

    // "open" isn't a valid closing status — only won/lost exist in
    // CloseDealInputSchema's discriminated union.
    const invalidStatusDeal = await createDeal("Invalid Status Deal");
    const invalidRes = await app.inject({
      method: "PATCH",
      url: `/v1/deals/${invalidStatusDeal}/close`,
      headers: { authorization: `Bearer ${managerToken}` },
      payload: { status: "open" },
    });
    expect(invalidRes.statusCode).toBe(400);
  });

  it("Viewer without deals:move can't close a deal: 403", async () => {
    const managerToken = await signJwt(supabaseIdManager);
    const viewerToken = await signJwt(supabaseIdViewer);

    const pipelineRes = await app.inject({
      method: "POST",
      url: "/v1/pipelines",
      headers: { authorization: `Bearer ${managerToken}` },
      payload: { id: pipelineIdFactory.create(), name: "Denied Closing Funnel" },
    });
    const pipelineId = pipelineRes.json().pipeline.id;

    const stageId = stageIdFactory.create();
    await app.inject({
      method: "POST",
      url: "/v1/stages",
      headers: { authorization: `Bearer ${managerToken}` },
      payload: { id: stageId, pipelineId, name: "Negotiation", sortOrder: 0 },
    });

    const dealId = dealIdFactory.create();
    await app.inject({
      method: "POST",
      url: "/v1/deals",
      headers: { authorization: `Bearer ${managerToken}` },
      payload: { id: dealId, pipelineId, stageId, name: "Deal", amount: 100000 },
    });

    const closeRes = await app.inject({
      method: "PATCH",
      url: `/v1/deals/${dealId}/close`,
      headers: { authorization: `Bearer ${viewerToken}` },
      payload: { status: "won" },
    });
    expect(closeRes.statusCode).toBe(403);
  });
});
