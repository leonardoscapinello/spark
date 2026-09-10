/**
 * Prova de ponta a ponta: dev-login provisiona organização nova com os
 * cinco grupos padrão, e quem criou vira Proprietário (docs/adr/0029).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Test } from "@nestjs/testing";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import { ZodValidationPipe } from "nestjs-zod";
import postgres from "postgres";
import { AppModule } from "../src/app.module.js";

const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://postgres:spark_dev@localhost:5432/spark";

const admin = postgres(DATABASE_URL, { prepare: false });
const email = `dev-login-teste-${crypto.randomUUID()}@empresa.com`;

let app: NestFastifyApplication;
let orgIdCriado: string;

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  app.useGlobalPipes(new ZodValidationPipe());
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
});

afterAll(async () => {
  await app.close();
  if (orgIdCriado) {
    await admin`DELETE FROM user_permission_groups WHERE org_id = ${orgIdCriado}`;
    await admin`DELETE FROM permission_groups WHERE org_id = ${orgIdCriado}`;
    await admin`DELETE FROM users WHERE org_id = ${orgIdCriado}`;
    await admin`DELETE FROM organizations WHERE id = ${orgIdCriado}`;
  }
  await admin.end();
});

describe("POST /v1/dev/login — provisiona organização com grupos padrão (docs/adr/0029)", () => {
  it("e-mail novo: cria organização, usuário, cinco grupos, e o usuário vira Proprietário", async () => {
    const res = await app.inject({ method: "POST", url: "/v1/dev/login", payload: { email } });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    orgIdCriado = body.orgId;

    const grupos = await admin`SELECT nome, capacidades FROM permission_groups WHERE org_id = ${body.orgId} ORDER BY nome`;
    expect(grupos.map((g) => g.nome)).toEqual(
      ["Administrador", "Agente", "Gerente", "Proprietário", "Visualizador"],
    );

    const atribuicao = await admin`
      SELECT pg.nome FROM user_permission_groups upg
      JOIN permission_groups pg ON pg.id = upg.group_id
      WHERE upg.user_id = ${body.userId}
    `;
    expect(atribuicao).toHaveLength(1);
    expect(atribuicao[0]?.nome).toBe("Proprietário");
  });

  it("mesmo e-mail de novo: reaproveita organização e usuário, não duplica grupo nenhum", async () => {
    const res = await app.inject({ method: "POST", url: "/v1/dev/login", payload: { email } });

    expect(res.statusCode).toBe(201);
    expect(res.json().orgId).toBe(orgIdCriado);

    const grupos = await admin`SELECT id FROM permission_groups WHERE org_id = ${orgIdCriado}`;
    expect(grupos).toHaveLength(5);
  });
});
