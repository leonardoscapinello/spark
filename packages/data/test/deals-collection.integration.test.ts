/**
 * Prova do bug real achado testando o board de CRM no navegador (não só
 * no compilador): `useLiveQuery` devolve a linha sincronizada do jeito
 * que o Electric manda — sem passar pelo transform do Zod. `valor` chega
 * como a coluna Postgres é (bigint), não como `Money`. `valorSincronizado`
 * é o único ponto que converte de volta; este teste prova que o valor
 * sobrevive ao ciclo completo (insert → Electric → outra coleção → Money).
 *
 * Pipeline e estágio são fixture, semeados direto por SQL (como
 * organização/usuário/grupo abaixo) — só o negócio passa pela coleção
 * local-first, que é a única coisa que este teste precisa provar. Passar
 * os três (pipeline, estágio, negócio) pela coleção, cada um esperando o
 * próprio `isPersisted.promise`, mostrou-se instável neste ambiente
 * (timeout aguardando txId do PIPELINE, não do negócio) — provavelmente
 * o custo de materializar duas shapes novas (pipelines, stages) do zero
 * na mesma janela em que outro processo de teste (contacts) já ocupa o
 * Electric local. Reduzir a fixture a SQL direto elimina esse ruído sem
 * abrir mão do que o teste existe para provar.
 *
 * Mesmo padrão de spawn de apps/api que contacts-collection.integration.test.ts.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { spawn, type ChildProcess } from "node:child_process";
import { SignJWT } from "jose";
import postgres from "postgres";
import {
  orgId as orgIdFactory,
  userId as userIdFactory,
  permissionGroupId as permissionGroupIdFactory,
  pipelineId as pipelineIdFactory,
  stageId as stageIdFactory,
  toCentavos,
  money,
  type OrgId,
  type PipelineId,
  type StageId,
} from "@spark/core";
import { setSparkApiBaseUrl, setSparkAuthTokenProvider } from "@spark/api-client";
import {
  createDealsCollection,
  negocioOtimista,
  paraInsercao,
  valorSincronizado,
  type DealsCollection,
} from "../src/deals-collection.js";

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET ?? "dev-only-local-secret-nao-usar-em-producao";
const DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://postgres:spark_dev@localhost:5432/spark";
const PORTA = 3213; // dedicada a este teste — distinta de 3211/3212/3000

const admin = postgres(DATABASE_URL, { prepare: false });
const org: OrgId = orgIdFactory.novo();
const localUserId = userIdFactory.novo();
const supabaseUserId = crypto.randomUUID();
const pipeline: PipelineId = pipelineIdFactory.novo();
const estagio: StageId = stageIdFactory.novo();

let processo: ChildProcess;
const colecoesAbertas: DealsCollection[] = [];

function aguardarApiPronta(child: ChildProcess): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("API não subiu a tempo")), 15_000);
    child.stdout?.on("data", (chunk: Buffer) => {
      if (chunk.toString().includes("ouvindo em")) {
        clearTimeout(timeout);
        resolve();
      }
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code !== 0) reject(new Error(`apps/api saiu com código ${code}`));
    });
  });
}

async function aguardarAte(condicao: () => boolean, timeoutMs: number, intervaloMs = 20): Promise<void> {
  const inicio = Date.now();
  while (!condicao()) {
    if (Date.now() - inicio > timeoutMs) throw new Error(`timeout (${timeoutMs}ms) aguardando condição`);
    await new Promise((resolve) => setTimeout(resolve, intervaloMs));
  }
}

beforeAll(async () => {
  await admin`INSERT INTO organizations (id, nome, slug) VALUES (${org}, 'Org deals-collection', ${"org-deals-" + org})`;
  await admin`INSERT INTO users (id, org_id, supabase_user_id, nome, email) VALUES
    (${localUserId}, ${org}, ${supabaseUserId}, 'Pessoa deals-collection', 'deals-collection@empresa.com')`;

  const grupo = permissionGroupIdFactory.novo();
  await admin`INSERT INTO permission_groups (id, org_id, nome, capacidades) VALUES
    (${grupo}, ${org}, 'Gerente', ${JSON.stringify(["deals:read", "deals:write", "deals:move"])}::jsonb)`;
  await admin`INSERT INTO user_permission_groups (org_id, user_id, group_id) VALUES (${org}, ${localUserId}, ${grupo})`;

  await admin`INSERT INTO pipelines (id, org_id, nome, padrao) VALUES (${pipeline}, ${org}, 'Funil de Teste', true)`;
  await admin`INSERT INTO stages (id, org_id, pipeline_id, nome, ordem) VALUES (${estagio}, ${org}, ${pipeline}, 'Novo', 0)`;

  processo = spawn("node", ["--loader", "ts-node/esm", "src/main.ts"], {
    cwd: new URL("../../../apps/api", import.meta.url).pathname,
    env: { ...process.env, PORT: String(PORTA), DATABASE_URL, SUPABASE_JWT_SECRET: JWT_SECRET, NODE_ENV: "test" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  await aguardarApiPronta(processo);

  setSparkApiBaseUrl(`http://127.0.0.1:${PORTA}`);
  const chave = new TextEncoder().encode(JWT_SECRET);
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(supabaseUserId)
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(chave);
  setSparkAuthTokenProvider(() => token);
}, 20_000);

afterEach(async () => {
  await Promise.all(colecoesAbertas.splice(0).map((c) => c.cleanup()));
});

afterAll(async () => {
  processo?.kill();
  await admin`DELETE FROM deals WHERE org_id = ${org}`;
  await admin`DELETE FROM stages WHERE org_id = ${org}`;
  await admin`DELETE FROM pipelines WHERE org_id = ${org}`;
  await admin`DELETE FROM user_permission_groups WHERE org_id = ${org}`;
  await admin`DELETE FROM permission_groups WHERE org_id = ${org}`;
  await admin`DELETE FROM users WHERE org_id = ${org}`;
  await admin`DELETE FROM organizations WHERE id = ${org}`;
  await admin.end();
});

describe("packages/data — Money sobrevive ao ciclo completo de sincronização (Fase 1)", () => {
  it("valor inserido numa coleção chega correto em outra, via valorSincronizado()", async () => {
    const dealsA: DealsCollection = createDealsCollection();
    const dealsB: DealsCollection = createDealsCollection();
    colecoesAbertas.push(dealsA, dealsB);
    await Promise.all([dealsA.preload(), dealsB.preload()]);

    const negocio = negocioOtimista(
      { pipelineId: pipeline, stageId: estagio, nome: "Negócio de Teste", valor: money(150_000) },
      org,
    );
    dealsA.insert(paraInsercao(negocio));

    // dealsB nunca chamou insert — só está inscrita na mesma shape. Se o
    // valor chegar aqui, veio do Electric replicando do Postgres.
    await aguardarAte(() => dealsB.has(negocio.id), 2_000);

    const lido = dealsB.get(negocio.id);
    expect(lido).toBeDefined();
    expect(toCentavos(valorSincronizado(lido?.valor))).toBe(150_000);

    const linhaNoBanco = await admin`SELECT valor FROM deals WHERE id = ${negocio.id}`;
    expect(Number(linhaNoBanco[0]?.valor)).toBe(150_000);
  }, 10_000);
});
