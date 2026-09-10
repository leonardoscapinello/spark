/**
 * POST /v1/contacts exige a capacidade contacts:write (docs/adr/0029) —
 * prova ponta a ponta que o CapabilityGuard nega por padrão e libera com
 * o grupo certo, não só o caminho de "usuário autenticado" que
 * SupabaseJwtGuard já cobre sozinho.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Test } from "@nestjs/testing";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import { ZodValidationPipe } from "nestjs-zod";
import { SignJWT } from "jose";
import postgres from "postgres";
import { orgId as orgIdFactory, userId as userIdFactory, contactId as contactIdFactory, permissionGroupId as permissionGroupIdFactory } from "@spark/core";
import { AppModule } from "../src/app.module.js";

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET ?? "dev-only-local-secret-nao-usar-em-producao";
const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://postgres:spark_dev@localhost:5432/spark";

const admin = postgres(DATABASE_URL, { prepare: false });

const org = orgIdFactory.novo();
const usuarioSemGrupo = userIdFactory.novo();
const supabaseIdSemGrupo = crypto.randomUUID();
const usuarioComGrupo = userIdFactory.novo();
const supabaseIdComGrupo = crypto.randomUUID();

async function assinarJwt(sub: string) {
  const chave = new TextEncoder().encode(JWT_SECRET);
  return new SignJWT({ role: "authenticated" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(sub)
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(chave);
}

let app: NestFastifyApplication;

beforeAll(async () => {
  await admin`INSERT INTO organizations (id, nome, slug) VALUES (${org}, 'Org capability', ${"org-capability-" + org})`;
  await admin`INSERT INTO users (id, org_id, supabase_user_id, nome, email) VALUES
    (${usuarioSemGrupo}, ${org}, ${supabaseIdSemGrupo}, 'Sem Grupo', 'sem-grupo@empresa.com'),
    (${usuarioComGrupo}, ${org}, ${supabaseIdComGrupo}, 'Com Grupo', 'com-grupo@empresa.com')`;

  const grupo = permissionGroupIdFactory.novo();
  await admin`INSERT INTO permission_groups (id, org_id, nome, capacidades) VALUES
    (${grupo}, ${org}, 'Agente', ${JSON.stringify(["contacts:write"])}::jsonb)`;
  await admin`INSERT INTO user_permission_groups (org_id, user_id, group_id) VALUES (${org}, ${usuarioComGrupo}, ${grupo})`;

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

describe("POST /v1/contacts — exige contacts:write (docs/adr/0029)", () => {
  it("usuário sem nenhum grupo: 403, não 201 — nega por padrão", async () => {
    const token = await assinarJwt(supabaseIdSemGrupo);
    const res = await app.inject({
      method: "POST",
      url: "/v1/contacts",
      headers: { authorization: `Bearer ${token}` },
      payload: { id: contactIdFactory.novo(), nome: "Contato Negado" },
    });
    expect(res.statusCode).toBe(403);
  });

  it("usuário com grupo que tem contacts:write: 201", async () => {
    const token = await assinarJwt(supabaseIdComGrupo);
    const res = await app.inject({
      method: "POST",
      url: "/v1/contacts",
      headers: { authorization: `Bearer ${token}` },
      payload: { id: contactIdFactory.novo(), nome: "Contato Permitido" },
    });
    expect(res.statusCode).toBe(201);
  });
});
