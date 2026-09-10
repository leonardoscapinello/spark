/**
 * Atividade ponta a ponta (roadmap.md, Fase 1): criar ligada a um
 * contato, concluir, reabrir — cada rota exigindo activities:write
 * (docs/adr/0029), nunca só "autenticado".
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

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET ?? "dev-only-local-secret-nao-usar-em-producao";
const DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://postgres:spark_dev@localhost:5432/spark";

const admin = postgres(DATABASE_URL, { prepare: false });

const org = orgIdFactory.novo();
const gerente = userIdFactory.novo();
const supabaseIdGerente = crypto.randomUUID();
const visualizador = userIdFactory.novo();
const supabaseIdVisualizador = crypto.randomUUID();
const contato = contactIdFactory.novo();

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
  await admin`INSERT INTO organizations (id, nome, slug) VALUES (${org}, 'Org atividades', ${"org-activities-" + org})`;
  await admin`INSERT INTO users (id, org_id, supabase_user_id, nome, email) VALUES
    (${gerente}, ${org}, ${supabaseIdGerente}, 'Gerente', 'gerente@empresa.com'),
    (${visualizador}, ${org}, ${supabaseIdVisualizador}, 'Visualizador', 'visualizador@empresa.com')`;

  const grupoGerente = permissionGroupIdFactory.novo();
  const grupoVisualizador = permissionGroupIdFactory.novo();
  await admin`INSERT INTO permission_groups (id, org_id, nome, capacidades) VALUES
    (${grupoGerente}, ${org}, 'Gerente', ${JSON.stringify(["contacts:write", "activities:read", "activities:write"])}::jsonb),
    (${grupoVisualizador}, ${org}, 'Visualizador', ${JSON.stringify(["activities:read"])}::jsonb)`;
  await admin`INSERT INTO user_permission_groups (org_id, user_id, group_id) VALUES
    (${org}, ${gerente}, ${grupoGerente}),
    (${org}, ${visualizador}, ${grupoVisualizador})`;

  await admin`INSERT INTO contacts (id, org_id, nome) VALUES (${contato}, ${org}, 'Contato de Teste')`;

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

describe("Atividade ponta a ponta — criar ligada a contato, concluir, reabrir (docs/adr/0029)", () => {
  it("Visualizador (sem activities:write) não cria atividade: 403", async () => {
    const token = await assinarJwt(supabaseIdVisualizador);
    const res = await app.inject({
      method: "POST",
      url: "/v1/activities",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        id: activityIdFactory.novo(),
        contactId: contato,
        tipo: "ligacao",
        titulo: "Ligar pra negociar",
        dataHora: new Date().toISOString(),
      },
    });
    expect(res.statusCode).toBe(403);
  });

  it("Gerente cria atividade ligada a um contato, conclui, e reabre", async () => {
    const token = await assinarJwt(supabaseIdGerente);
    const atividadeId = activityIdFactory.novo();

    const resCriar = await app.inject({
      method: "POST",
      url: "/v1/activities",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        id: atividadeId,
        contactId: contato,
        tipo: "ligacao",
        titulo: "Ligar pra negociar",
        dataHora: "2026-09-15T14:00:00.000Z",
      },
    });
    expect(resCriar.statusCode).toBe(201);
    const corpoCriar = resCriar.json();
    expect(corpoCriar.activity.titulo).toBe("Ligar pra negociar");
    expect(corpoCriar.activity.tipo).toBe("ligacao");
    expect(corpoCriar.activity.contactId).toBe(contato);
    expect(corpoCriar.activity.concluida).toBe(false);
    expect(corpoCriar.activity.concluidaEm).toBeNull();
    expect(typeof corpoCriar.txid).toBe("number");

    const resConcluir = await app.inject({
      method: "PATCH",
      url: `/v1/activities/${atividadeId}/complete`,
      headers: { authorization: `Bearer ${token}` },
      payload: { concluida: true },
    });
    expect(resConcluir.statusCode).toBe(200);
    expect(resConcluir.json().activity.concluida).toBe(true);
    expect(resConcluir.json().activity.concluidaEm).not.toBeNull();

    const resReabrir = await app.inject({
      method: "PATCH",
      url: `/v1/activities/${atividadeId}/complete`,
      headers: { authorization: `Bearer ${token}` },
      payload: { concluida: false },
    });
    expect(resReabrir.statusCode).toBe(200);
    expect(resReabrir.json().activity.concluida).toBe(false);
    expect(resReabrir.json().activity.concluidaEm).toBeNull();
  });
});
