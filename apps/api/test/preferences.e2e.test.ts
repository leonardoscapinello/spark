/**
 * PUT /v1/preferences/:key — preferência de interface por pessoa. Prova o
 * que importa: cria, atualiza mantendo o id, só com sessão, e recusa chave
 * fora do formato area.nome.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Test } from "@nestjs/testing";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import { ZodValidationPipe } from "nestjs-zod";
import { SignJWT } from "jose";
import postgres from "postgres";
import { orgId as orgIdFactory, userId as userIdFactory, userPreferenceId } from "@spark/core";
import { AppModule } from "../src/app.module.js";

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET ?? "dev-only-local-secret-do-not-use-in-production";
const DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgresql://postgres:spark_dev@localhost:5432/spark";
const admin = postgres(DATABASE_URL, { prepare: false });

const org = orgIdFactory.create();
const user = userIdFactory.create();
const userSub = crypto.randomUUID();

async function signJwt(sub: string) {
  const key = new TextEncoder().encode(JWT_SECRET);
  return new SignJWT({ role: "authenticated" }).setProtectedHeader({ alg: "HS256" }).setSubject(sub).setIssuedAt().setExpirationTime("1h").sign(key);
}

let app: NestFastifyApplication;
let token: string;

beforeAll(async () => {
  await admin`INSERT INTO organizations (id, name, slug) VALUES (${org}, 'Prefs Org', ${"prefs-org-" + org})`;
  await admin`INSERT INTO users (id, org_id, supabase_user_id, name, email) VALUES (${user}, ${org}, ${userSub}, 'Pessoa', 'pessoa@company.com')`;
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  app.useGlobalPipes(new ZodValidationPipe());
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  token = await signJwt(userSub);
});

afterAll(async () => {
  await app?.close();
  await admin`DELETE FROM user_preferences WHERE org_id = ${org}`;
  await admin`DELETE FROM users WHERE org_id = ${org}`;
  await admin`DELETE FROM organizations WHERE id = ${org}`;
  await admin.end();
});

describe("PUT /v1/preferences/:key", () => {
  it("creates, then updates the same row keeping its id", async () => {
    const id = userPreferenceId.create();
    const first = await app.inject({ method: "PUT", url: "/v1/preferences/rail.pinned", headers: { authorization: `Bearer ${token}` }, payload: { id, value: true } });
    expect(first.statusCode).toBe(200);
    expect(first.json().preference).toMatchObject({ id, key: "rail.pinned", value: true, userId: user, orgId: org });

    const second = await app.inject({ method: "PUT", url: "/v1/preferences/rail.pinned", headers: { authorization: `Bearer ${token}` }, payload: { id: userPreferenceId.create(), value: false } });
    expect(second.statusCode).toBe(200);
    expect(second.json().preference).toMatchObject({ id, value: false });
    const rows = await admin`SELECT count(*)::int AS n FROM user_preferences WHERE org_id = ${org}`;
    expect(rows[0]?.n).toBe(1);
  });

  it("accepts arrays and objects as values", async () => {
    const res = await app.inject({ method: "PUT", url: "/v1/preferences/contacts.hiddenColumns", headers: { authorization: `Bearer ${token}` }, payload: { id: userPreferenceId.create(), value: ["custom:plano", "score"] } });
    expect(res.statusCode).toBe(200);
    expect(res.json().preference.value).toEqual(["custom:plano", "score"]);
  });

  it("rejects a key outside area.nome and a request without a session", async () => {
    const bad = await app.inject({ method: "PUT", url: "/v1/preferences/Rail", headers: { authorization: `Bearer ${token}` }, payload: { id: userPreferenceId.create(), value: true } });
    expect(bad.statusCode).toBe(400);
    const anon = await app.inject({ method: "PUT", url: "/v1/preferences/rail.pinned", payload: { id: userPreferenceId.create(), value: true } });
    expect(anon.statusCode).toBe(401);
  });
});
