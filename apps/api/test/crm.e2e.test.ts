/**
 * Fluxo de CRM ponta a ponta (roadmap.md, Fase 1): criar pipeline, criar
 * estágio, criar negócio, mover negócio — cada rota exigindo a capacidade
 * certa (docs/adr/0029), nunca só "autenticado".
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

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET ?? "dev-only-local-secret-nao-usar-em-producao";
const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://postgres:spark_dev@localhost:5432/spark";

const admin = postgres(DATABASE_URL, { prepare: false });

const org = orgIdFactory.novo();
const gerente = userIdFactory.novo();
const supabaseIdGerente = crypto.randomUUID();
const agente = userIdFactory.novo();
const supabaseIdAgente = crypto.randomUUID();
const visualizador = userIdFactory.novo();
const supabaseIdVisualizador = crypto.randomUUID();

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
  await admin`INSERT INTO organizations (id, nome, slug) VALUES (${org}, 'Org CRM', ${"org-crm-" + org})`;
  await admin`INSERT INTO users (id, org_id, supabase_user_id, nome, email) VALUES
    (${gerente}, ${org}, ${supabaseIdGerente}, 'Gerente', 'gerente@empresa.com'),
    (${agente}, ${org}, ${supabaseIdAgente}, 'Agente', 'agente@empresa.com'),
    (${visualizador}, ${org}, ${supabaseIdVisualizador}, 'Visualizador', 'visualizador@empresa.com')`;

  const grupoGerente = permissionGroupIdFactory.novo();
  const grupoAgente = permissionGroupIdFactory.novo();
  const grupoVisualizador = permissionGroupIdFactory.novo();
  await admin`INSERT INTO permission_groups (id, org_id, nome, capacidades) VALUES
    (${grupoGerente}, ${org}, 'Gerente', ${JSON.stringify(["pipelines:manage", "deals:read", "deals:write", "deals:move"])}::jsonb),
    (${grupoAgente}, ${org}, 'Agente', ${JSON.stringify(["deals:read", "deals:write", "deals:move"])}::jsonb),
    (${grupoVisualizador}, ${org}, 'Visualizador', ${JSON.stringify(["deals:read"])}::jsonb)`;
  await admin`INSERT INTO user_permission_groups (org_id, user_id, group_id) VALUES
    (${org}, ${gerente}, ${grupoGerente}),
    (${org}, ${agente}, ${grupoAgente}),
    (${org}, ${visualizador}, ${grupoVisualizador})`;

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

describe("CRM ponta a ponta — pipeline → estágio → negócio → mover (docs/adr/0029)", () => {
  it("Agente (sem pipelines:manage) não cria pipeline: 403", async () => {
    const token = await assinarJwt(supabaseIdAgente);
    const res = await app.inject({
      method: "POST",
      url: "/v1/pipelines",
      headers: { authorization: `Bearer ${token}` },
      payload: { id: pipelineIdFactory.novo(), nome: "Funil Negado" },
    });
    expect(res.statusCode).toBe(403);
  });

  it("Gerente cria pipeline, estágio, negócio, e move o negócio de estágio", async () => {
    const tokenGerente = await assinarJwt(supabaseIdGerente);

    const resPipeline = await app.inject({
      method: "POST",
      url: "/v1/pipelines",
      headers: { authorization: `Bearer ${tokenGerente}` },
      payload: { id: pipelineIdFactory.novo(), nome: "Funil de Vendas" },
    });
    expect(resPipeline.statusCode).toBe(201);
    const pipelineId = resPipeline.json().pipeline.id;

    const stageAId = stageIdFactory.novo();
    const stageBId = stageIdFactory.novo();
    const resStageA = await app.inject({
      method: "POST",
      url: "/v1/stages",
      headers: { authorization: `Bearer ${tokenGerente}` },
      payload: { id: stageAId, pipelineId, nome: "Qualificação", ordem: 0 },
    });
    expect(resStageA.statusCode).toBe(201);

    const resStageB = await app.inject({
      method: "POST",
      url: "/v1/stages",
      headers: { authorization: `Bearer ${tokenGerente}` },
      payload: { id: stageBId, pipelineId, nome: "Negociação", ordem: 1 },
    });
    expect(resStageB.statusCode).toBe(201);

    const dealIdCriado = dealIdFactory.novo();
    const resDeal = await app.inject({
      method: "POST",
      url: "/v1/deals",
      headers: { authorization: `Bearer ${tokenGerente}` },
      payload: { id: dealIdCriado, pipelineId, stageId: stageAId, nome: "Negócio Teste", valor: 150000 },
    });
    expect(resDeal.statusCode).toBe(201);
    const corpoDeal = resDeal.json();
    // a prova do bug real corrigido: Money é objeto opaco por Symbol —
    // se a resposta não convertesse de volta, "valor" viraria {} no JSON.
    expect(corpoDeal.deal.valor).toBe(150000);
    expect(corpoDeal.deal.stageId).toBe(stageAId);
    expect(typeof corpoDeal.txid).toBe("number");

    const resMove = await app.inject({
      method: "PATCH",
      url: `/v1/deals/${dealIdCriado}/move`,
      headers: { authorization: `Bearer ${tokenGerente}` },
      payload: { stageId: stageBId },
    });
    expect(resMove.statusCode).toBe(200);
    expect(resMove.json().deal.stageId).toBe(stageBId);
    expect(resMove.json().deal.valor).toBe(150000);

    const resRenomear = await app.inject({
      method: "PATCH",
      url: `/v1/stages/${stageAId}/rename`,
      headers: { authorization: `Bearer ${tokenGerente}` },
      payload: { nome: "Qualificação Renomeada" },
    });
    expect(resRenomear.statusCode).toBe(200);
    expect(resRenomear.json().stage.nome).toBe("Qualificação Renomeada");

    const resAgenteRenomear = await app.inject({
      method: "PATCH",
      url: `/v1/stages/${stageBId}/rename`,
      headers: { authorization: `Bearer ${await assinarJwt(supabaseIdAgente)}` },
      payload: { nome: "Não deveria valer" },
    });
    expect(resAgenteRenomear.statusCode).toBe(403);
  });

  it("Gerente fecha negócio como ganho, e outro como perdido com motivo", async () => {
    const tokenGerente = await assinarJwt(supabaseIdGerente);

    const resPipeline = await app.inject({
      method: "POST",
      url: "/v1/pipelines",
      headers: { authorization: `Bearer ${tokenGerente}` },
      payload: { id: pipelineIdFactory.novo(), nome: "Funil de Fechamento" },
    });
    const pipelineId = resPipeline.json().pipeline.id;

    const stageId = stageIdFactory.novo();
    await app.inject({
      method: "POST",
      url: "/v1/stages",
      headers: { authorization: `Bearer ${tokenGerente}` },
      payload: { id: stageId, pipelineId, nome: "Negociação", ordem: 0 },
    });

    async function criarNegocio(nome: string) {
      const id = dealIdFactory.novo();
      await app.inject({
        method: "POST",
        url: "/v1/deals",
        headers: { authorization: `Bearer ${tokenGerente}` },
        payload: { id, pipelineId, stageId, nome, valor: 100000 },
      });
      return id;
    }

    const negocioGanho = await criarNegocio("Negócio Ganho");
    const resGanho = await app.inject({
      method: "PATCH",
      url: `/v1/deals/${negocioGanho}/close`,
      headers: { authorization: `Bearer ${tokenGerente}` },
      payload: { status: "ganho" },
    });
    expect(resGanho.statusCode).toBe(200);
    expect(resGanho.json().deal.status).toBe("ganho");
    expect(resGanho.json().deal.motivoPerda).toBeNull();

    const negocioPerdido = await criarNegocio("Negócio Perdido");
    const resPerdido = await app.inject({
      method: "PATCH",
      url: `/v1/deals/${negocioPerdido}/close`,
      headers: { authorization: `Bearer ${tokenGerente}` },
      payload: { status: "perdido", motivoPerda: "Preço acima do orçamento do cliente" },
    });
    expect(resPerdido.statusCode).toBe(200);
    expect(resPerdido.json().deal.status).toBe("perdido");
    expect(resPerdido.json().deal.motivoPerda).toBe("Preço acima do orçamento do cliente");

    // "aberto" não é um status de fechamento válido — só ganho/perdido
    // existem na união discriminada de CloseDealInputSchema.
    const negocioInvalido = await criarNegocio("Negócio Status Inválido");
    const resInvalido = await app.inject({
      method: "PATCH",
      url: `/v1/deals/${negocioInvalido}/close`,
      headers: { authorization: `Bearer ${tokenGerente}` },
      payload: { status: "aberto" },
    });
    expect(resInvalido.statusCode).toBe(400);
  });

  it("Visualizador sem deals:move não fecha negócio: 403", async () => {
    const tokenGerente = await assinarJwt(supabaseIdGerente);
    const tokenVisualizador = await assinarJwt(supabaseIdVisualizador);

    const resPipeline = await app.inject({
      method: "POST",
      url: "/v1/pipelines",
      headers: { authorization: `Bearer ${tokenGerente}` },
      payload: { id: pipelineIdFactory.novo(), nome: "Funil Fechamento Negado" },
    });
    const pipelineId = resPipeline.json().pipeline.id;

    const stageId = stageIdFactory.novo();
    await app.inject({
      method: "POST",
      url: "/v1/stages",
      headers: { authorization: `Bearer ${tokenGerente}` },
      payload: { id: stageId, pipelineId, nome: "Negociação", ordem: 0 },
    });

    const dealId = dealIdFactory.novo();
    await app.inject({
      method: "POST",
      url: "/v1/deals",
      headers: { authorization: `Bearer ${tokenGerente}` },
      payload: { id: dealId, pipelineId, stageId, nome: "Negócio", valor: 100000 },
    });

    const resFechar = await app.inject({
      method: "PATCH",
      url: `/v1/deals/${dealId}/close`,
      headers: { authorization: `Bearer ${tokenVisualizador}` },
      payload: { status: "ganho" },
    });
    expect(resFechar.statusCode).toBe(403);
  });
});
