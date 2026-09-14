/**
 * The proof Bloco 4 requires (docs/arquitetura/fase-0.md): RLS actually
 * blocks reading another organization's data, not just in the ADR's theory.
 *
 * Needs the local Postgres running (docker compose up -d postgres) with
 * the migration applied (pnpm db:migrate) — CI does both before this test.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import postgres from "postgres";
import {
  orgId as orgIdFactory,
  contactId as contactIdFactory,
  permissionGroupId as permissionGroupIdFactory,
  pipelineId as pipelineIdFactory,
  stageId as stageIdFactory,
  dealId as dealIdFactory,
} from "@spark/core";

const DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgresql://postgres:spark_dev@localhost:5432/spark";
const APP_DATABASE_URL = DATABASE_URL.replace(
  /postgres:([^@]+)@/,
  "app_user:app_user_dev_password@",
);

const admin = postgres(DATABASE_URL, { prepare: false });
const appUser = postgres(APP_DATABASE_URL, { prepare: false });

const orgA = orgIdFactory.create();
const orgB = orgIdFactory.create();
const contactOrgA = contactIdFactory.create();
const contactOrgB = contactIdFactory.create();

beforeAll(async () => {
  // seed as admin — it BYPASSES RLS (see the `postgres` role on this
  // Supabase image), so it can see and write both organizations at once.
  await admin`INSERT INTO organizations (id, name, slug) VALUES
    (${orgA}, 'Organization A', ${"org-a-" + orgA}),
    (${orgB}, 'Organization B', ${"org-b-" + orgB})`;

  await admin`INSERT INTO contacts (id, org_id, name) VALUES
    (${contactOrgA}, ${orgA}, 'Contact of A'),
    (${contactOrgB}, ${orgB}, 'Contact of B')`;
});

afterAll(async () => {
  await admin`DELETE FROM contacts WHERE org_id IN (${orgA}, ${orgB})`;
  await admin`DELETE FROM organizations WHERE id IN (${orgA}, ${orgB})`;
  await admin.end();
  await appUser.end();
});

describe("RLS — isolation between organizations (docs/adr/0022, docs/adr/0026)", () => {
  it("with org A's context, sees only org A's contact", async () => {
    const rows = await appUser.begin(async (tx) => {
      await tx.unsafe(`SET LOCAL app.current_org_id = '${orgA}'`);
      return tx`SELECT id, name FROM contacts ORDER BY name`;
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe(contactOrgA);
  });

  it("with org B's context, sees only org B's contact — not A's", async () => {
    const rows = await appUser.begin(async (tx) => {
      await tx.unsafe(`SET LOCAL app.current_org_id = '${orgB}'`);
      return tx`SELECT id, name FROM contacts ORDER BY name`;
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe(contactOrgB);
  });

  it("with no context set at all, sees NOTHING — deny by default, not allow all", async () => {
    // Its own connection, isolated from the others — on purpose. On a
    // pooled connection that already saw `SET LOCAL app.current_org_id`
    // at some point, Postgres starts treating that custom GUC as "seen",
    // and current_setting(..., true) comes back '' (empty string) instead
    // of NULL once the transaction that set it ends — not truly "never
    // set." That alone already proves the point: the policy doesn't even
    // accept '' as a uuid (an error, not a released row) — but the "never
    // set" test needs a session that genuinely never saw the GUC.
    const isolatedConnection = postgres(APP_DATABASE_URL, { prepare: false, max: 1 });
    try {
      const rows = await isolatedConnection.begin(async (tx) => tx`SELECT id FROM contacts`);
      expect(rows).toHaveLength(0);
    } finally {
      await isolatedConnection.end();
    }
  });

  it("even trying to, a query with no org_id filter never leaks another organization", async () => {
    // the whole point of RLS: even if the application code "forgets" the
    // WHERE org_id = ..., the database never returns a row outside the context.
    const rows = await appUser.begin(async (tx) => {
      await tx.unsafe(`SET LOCAL app.current_org_id = '${orgA}'`);
      return tx`SELECT * FROM contacts`; // no WHERE at all, on purpose
    });
    expect(rows.every((l) => l.org_id === orgA)).toBe(true);
    expect(rows.some((l) => l.id === contactOrgB)).toBe(false);
  });

  it("organizations is isolated too — org A doesn't see org B's row", async () => {
    const rows = await appUser.begin(async (tx) => {
      await tx.unsafe(`SET LOCAL app.current_org_id = '${orgA}'`);
      return tx`SELECT id FROM organizations`;
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe(orgA);
  });

  it("the admin (bypasses RLS) still sees both — that's the migration/support path, not the business one", async () => {
    const rows = await admin`SELECT id FROM contacts WHERE org_id IN (${orgA}, ${orgB})`;
    expect(rows).toHaveLength(2);
  });
});

describe("RLS — permission_groups and user_permission_groups isolate by org (docs/adr/0029)", () => {
  // this describe's own orgs, not the ones above — two sibling describes
  // run in sequence (the first's afterAll runs before the second's
  // beforeAll), so reusing orgA/orgB would delete the FK out from under this test.
  const orgC = orgIdFactory.create();
  const orgD = orgIdFactory.create();
  const groupOrgC = permissionGroupIdFactory.create();
  const groupOrgD = permissionGroupIdFactory.create();

  beforeAll(async () => {
    await admin`INSERT INTO organizations (id, name, slug) VALUES
      (${orgC}, 'Organization C', ${"org-c-" + orgC}),
      (${orgD}, 'Organization D', ${"org-d-" + orgD})`;

    await admin`INSERT INTO permission_groups (id, org_id, name, capabilities) VALUES
      (${groupOrgC}, ${orgC}, 'Manager', ${JSON.stringify(["contacts:read", "contacts:write"])}::jsonb),
      (${groupOrgD}, ${orgD}, 'Manager', ${JSON.stringify(["contacts:read"])}::jsonb)`;
  });

  afterAll(async () => {
    await admin`DELETE FROM permission_groups WHERE org_id IN (${orgC}, ${orgD})`;
    await admin`DELETE FROM organizations WHERE id IN (${orgC}, ${orgD})`;
  });

  it("org C sees only org C's group", async () => {
    const rows = await appUser.begin(async (tx) => {
      await tx.unsafe(`SET LOCAL app.current_org_id = '${orgC}'`);
      return tx`SELECT id, capabilities FROM permission_groups`;
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe(groupOrgC);
    // postgres.js (raw driver, without Drizzle's type mapping) returns
    // jsonb as a string — explicit parse, not an application bug.
    expect(JSON.parse(rows[0]?.capabilities as string)).toEqual(["contacts:read", "contacts:write"]);
  });

  it("org D can't see org C's group even without a WHERE", async () => {
    const rows = await appUser.begin(async (tx) => {
      await tx.unsafe(`SET LOCAL app.current_org_id = '${orgD}'`);
      return tx`SELECT * FROM permission_groups`;
    });
    expect(rows.every((l) => l.org_id === orgD)).toBe(true);
    expect(rows.some((l) => l.id === groupOrgC)).toBe(false);
  });
});

describe("RLS — pipelines, stages, and deals isolate by org (roadmap.md, Fase 1)", () => {
  const orgE = orgIdFactory.create();
  const orgF = orgIdFactory.create();
  const pipelineOrgE = pipelineIdFactory.create();
  const pipelineOrgF = pipelineIdFactory.create();
  const stageOrgE = stageIdFactory.create();
  const stageOrgF = stageIdFactory.create();
  const dealOrgE = dealIdFactory.create();
  const dealOrgF = dealIdFactory.create();

  beforeAll(async () => {
    await admin`INSERT INTO organizations (id, name, slug) VALUES
      (${orgE}, 'Organization E', ${"org-e-" + orgE}),
      (${orgF}, 'Organization F', ${"org-f-" + orgF})`;

    await admin`INSERT INTO pipelines (id, org_id, name, is_default) VALUES
      (${pipelineOrgE}, ${orgE}, 'Pipeline E', true),
      (${pipelineOrgF}, ${orgF}, 'Pipeline F', true)`;

    await admin`INSERT INTO stages (id, org_id, pipeline_id, name, sort_order) VALUES
      (${stageOrgE}, ${orgE}, ${pipelineOrgE}, 'Qualification', 0),
      (${stageOrgF}, ${orgF}, ${pipelineOrgF}, 'Qualification', 0)`;

    await admin`INSERT INTO deals (id, org_id, pipeline_id, stage_id, name, amount) VALUES
      (${dealOrgE}, ${orgE}, ${pipelineOrgE}, ${stageOrgE}, 'Deal E', 500000),
      (${dealOrgF}, ${orgF}, ${pipelineOrgF}, ${stageOrgF}, 'Deal F', 300000)`;
  });

  afterAll(async () => {
    await admin`DELETE FROM deals WHERE org_id IN (${orgE}, ${orgF})`;
    await admin`DELETE FROM stages WHERE org_id IN (${orgE}, ${orgF})`;
    await admin`DELETE FROM pipelines WHERE org_id IN (${orgE}, ${orgF})`;
    await admin`DELETE FROM organizations WHERE id IN (${orgE}, ${orgF})`;
  });

  it("org E sees only its own pipeline, stage, and deal", async () => {
    const [deals, stages, pipelines] = await appUser.begin(async (tx) => {
      await tx.unsafe(`SET LOCAL app.current_org_id = '${orgE}'`);
      return Promise.all([
        tx`SELECT id, amount FROM deals`,
        tx`SELECT id FROM stages`,
        tx`SELECT id FROM pipelines`,
      ]);
    });
    expect(deals).toHaveLength(1);
    expect(deals[0]?.id).toBe(dealOrgE);
    expect(Number(deals[0]?.amount)).toBe(500000);
    expect(stages).toHaveLength(1);
    expect(stages[0]?.id).toBe(stageOrgE);
    expect(pipelines).toHaveLength(1);
    expect(pipelines[0]?.id).toBe(pipelineOrgE);
  });

  it("org F can't see org E's deal, stage, or pipeline, even without a WHERE", async () => {
    const [deals, stages, pipelines] = await appUser.begin(async (tx) => {
      await tx.unsafe(`SET LOCAL app.current_org_id = '${orgF}'`);
      return Promise.all([tx`SELECT * FROM deals`, tx`SELECT * FROM stages`, tx`SELECT * FROM pipelines`]);
    });
    expect(deals.every((l) => l.org_id === orgF)).toBe(true);
    expect(stages.every((l) => l.org_id === orgF)).toBe(true);
    expect(pipelines.every((l) => l.org_id === orgF)).toBe(true);
    expect(deals.some((l) => l.id === dealOrgE)).toBe(false);
  });
});
