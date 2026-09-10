/**
 * Prova de ponta a ponta do Bloco 5 (docs/arquitetura/fase-0.md): "login
 * funciona ponta a ponta" — aqui, verificar um JWT no formato da Supabase
 * Auth e resolver pro usuário local certo, via HTTP de verdade (app.inject,
 * sem precisar abrir porta de rede — mais rápido e mais confiável em CI).
 *
 * Não há projeto Supabase real disponível neste ambiente — o que É
 * verificável e o que importa verificar é a MECÂNICA: um JWT assinado com
 * o SUPABASE_JWT_SECRET configurado é aceito; um assinado com segredo
 * errado, não. Trocar o segredo de dev por um de produção real é
 * configuração, não mudança de código.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Test } from "@nestjs/testing";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import { ZodValidationPipe } from "nestjs-zod";
import { SignJWT } from "jose";
import postgres from "postgres";
import { orgId as orgIdFactory, userId as userIdFactory } from "@spark/core";
import { AppModule } from "../src/app.module.js";

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET ?? "dev-only-local-secret-nao-usar-em-producao";
const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://postgres:spark_dev@localhost:5432/spark";

const admin = postgres(DATABASE_URL, { prepare: false });

const org = orgIdFactory.novo();
const localUserId = userIdFactory.novo();
const supabaseUserIdProvisionado = crypto.randomUUID();
const supabaseUserIdSemProvisionamento = crypto.randomUUID();

async function assinarJwt(sub: string, segredo = JWT_SECRET) {
  const chave = new TextEncoder().encode(segredo);
  return new SignJWT({ email: "pessoa@empresa.com", role: "authenticated" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(sub)
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(chave);
}

let app: NestFastifyApplication;

beforeAll(async () => {
  await admin`INSERT INTO organizations (id, nome, slug) VALUES (${org}, 'Org de teste', ${"org-teste-" + org})`;
  await admin`INSERT INTO users (id, org_id, supabase_user_id, nome, email) VALUES
    (${localUserId}, ${org}, ${supabaseUserIdProvisionado}, 'Pessoa de Teste', 'pessoa@empresa.com')`;

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

describe("GET /v1/me — login ponta a ponta (docs/arquitetura/fase-0.md, Bloco 5)", () => {
  it("sem Authorization, 401", async () => {
    const res = await app.inject({ method: "GET", url: "/v1/me" });
    expect(res.statusCode).toBe(401);
  });

  it("com JWT assinado por segredo errado, 401 — não aceita qualquer token", async () => {
    const token = await assinarJwt(supabaseUserIdProvisionado, "segredo-errado");
    const res = await app.inject({
      method: "GET",
      url: "/v1/me",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(401);
  });

  it("com JWT válido de usuário sem provisionamento local, 404", async () => {
    const token = await assinarJwt(supabaseUserIdSemProvisionamento);
    const res = await app.inject({
      method: "GET",
      url: "/v1/me",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(404);
  });

  it("com JWT válido de usuário provisionado, 200 e o perfil certo", async () => {
    const token = await assinarJwt(supabaseUserIdProvisionado);
    const res = await app.inject({
      method: "GET",
      url: "/v1/me",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.id).toBe(localUserId);
    expect(body.orgId).toBe(org);
    expect(body.nome).toBe("Pessoa de Teste");
    expect(body.email).toBe("pessoa@empresa.com");
    // desativadoEm precisa estar presente e null — não "sumido" — porque o
    // schema Zod (fonte única, ADR-0019) declara nullable, não optional.
    expect(body).toHaveProperty("desativadoEm", null);
  });
});
