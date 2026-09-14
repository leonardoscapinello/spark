/**
 * GET /v1/contacts/search — o caminho de leitura pela API (docs/adr/0026)
 * contra o índice GIN da migration 0029. Prova o que a tela não prova:
 * acento ignorado no banco, prefixo, arquivado fora, e a capacidade
 * contacts:read exigida.
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
const DATABASE_URL = process.env.TEST_DATABASE_URL!;
const admin = postgres(DATABASE_URL, { prepare: false });

const org = orgIdFactory.create();
const otherOrg = orgIdFactory.create();
const reader = userIdFactory.create();
const readerSub = crypto.randomUUID();
const nobody = userIdFactory.create();
const nobodySub = crypto.randomUUID();
const jose = contactIdFactory.create();
const ana = contactIdFactory.create();
const archived = contactIdFactory.create();
const foreign = contactIdFactory.create();

async function signJwt(sub: string) {
  const key = new TextEncoder().encode(JWT_SECRET);
  return new SignJWT({ role: "authenticated" }).setProtectedHeader({ alg: "HS256" }).setSubject(sub).setIssuedAt().setExpirationTime("1h").sign(key);
}

let app: NestFastifyApplication;
let token: string;

beforeAll(async () => {
  await admin`INSERT INTO organizations (id, name, slug) VALUES (${org}, 'Search Org', ${"search-org-" + org}), (${otherOrg}, 'Other Org', ${"other-org-" + otherOrg})`;
  await admin`INSERT INTO users (id, org_id, supabase_user_id, name, email) VALUES
    (${reader}, ${org}, ${readerSub}, 'Reader', 'reader@company.com'),
    (${nobody}, ${org}, ${nobodySub}, 'Nobody', 'nobody@company.com')`;
  const group = permissionGroupIdFactory.create();
  await seedPermissionGroup(admin, org, group, "Leitor", ["contacts:read"]);
  await admin`INSERT INTO user_permission_groups (org_id, user_id, group_id) VALUES (${org}, ${reader}, ${group})`;
  await admin`INSERT INTO contacts (id, org_id, name, email, deleted_at) VALUES
    (${jose}, ${org}, 'José Conceição', 'jose@vega.com', NULL),
    (${ana}, ${org}, 'Ana Prado', 'ana@arco.com', NULL),
    (${archived}, ${org}, 'José Arquivado', NULL, now()),
    (${foreign}, ${otherOrg}, 'José de Outra Org', NULL, NULL)`;

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  app.useGlobalPipes(new ZodValidationPipe());
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  token = await signJwt(readerSub);
});

afterAll(async () => {
  await app.close();
  await admin`DELETE FROM contacts WHERE org_id IN (${org}, ${otherOrg})`;
  await admin`DELETE FROM user_permission_groups WHERE org_id = ${org}`;
  await admin`DELETE FROM permission_groups WHERE org_id = ${org}`;
  await admin`DELETE FROM users WHERE org_id = ${org}`;
  await admin`DELETE FROM organizations WHERE id IN (${org}, ${otherOrg})`;
  await admin.end();
});

function search(q: string, bearer = token) {
  return app.inject({ method: "GET", url: `/v1/contacts/search?q=${encodeURIComponent(q)}`, headers: { authorization: `Bearer ${bearer}` } });
}

describe("GET /v1/contacts/search", () => {
  it("ignora acento nos dois lados e casa por prefixo", async () => {
    const res = await search("conceicao");
    expect(res.statusCode).toBe(200);
    expect(res.json().contacts.map((c: { id: string }) => c.id)).toEqual([jose]);

    const prefix = await search("Jos");
    expect(prefix.json().contacts.map((c: { id: string }) => c.id)).toEqual([jose]);
  });

  it("dois termos exigem os dois, e o e-mail conta", async () => {
    expect((await search("jose vega")).json().contacts.map((c: { id: string }) => c.id)).toEqual([jose]);
    expect((await search("jose arco")).json().contacts).toEqual([]);
  });

  it("não devolve arquivado nem pessoa de outra organização", async () => {
    const ids = (await search("jose")).json().contacts.map((c: { id: string }) => c.id);
    expect(ids).toEqual([jose]);
  });

  it("texto sem termo útil devolve lista vazia, não erro", async () => {
    const res = await search("&&&");
    expect(res.statusCode).toBe(200);
    expect(res.json().contacts).toEqual([]);
  });

  it("q vazio é 400 e sem contacts:read é 403", async () => {
    expect((await app.inject({ method: "GET", url: "/v1/contacts/search?q=", headers: { authorization: `Bearer ${token}` } })).statusCode).toBe(400);
    expect((await search("jose", await signJwt(nobodySub))).statusCode).toBe(403);
  });
});
