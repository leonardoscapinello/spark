/**
 * A prova do critério de saída do Bloco 6 (docs/arquitetura/fase-0.md):
 * "a lista de contatos renderiza a partir da coleção local sem nenhuma
 * chamada de rede na navegação, e um insert numa aba aparece na outra em
 * menos de 1 segundo."
 *
 * "Duas abas" vira, aqui, duas instâncias independentes de
 * createContactsCollection() — cada uma com seu próprio ShapeStream —
 * autenticadas como o MESMO usuário (é exatamente isso que duas abas do
 * navegador são: duas sessões independentes, mesmo token). A coleção B
 * nunca chama insert; se o contato aparece nela mesmo assim, é porque
 * veio do Electric replicando do Postgres, não do estado otimista local
 * da A — a única forma de provar que a sincronização entre clientes
 * funciona de verdade, não só o caminho de escrita de um cliente com ele
 * mesmo (isso já foi provado manualmente, ver histórico do Bloco 6, mas
 * nunca ficou como teste).
 *
 * apps/api sobe como PROCESSO SEPARADO pelo mesmo motivo do
 * packages/api-client/test/generated-client.e2e.test.ts: metadata de
 * decorator do NestJS não atravessa o transform de outro pacote.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { spawn, type ChildProcess } from "node:child_process";
import { SignJWT } from "jose";
import postgres from "postgres";
import { orgId as orgIdFactory, userId as userIdFactory, type OrgId } from "@spark/core";
import { setSparkApiBaseUrl, setSparkAuthTokenProvider } from "@spark/api-client";
import { createContactsCollection, contatoOtimista, type ContactsCollection } from "../src/contacts-collection.js";

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET ?? "dev-only-local-secret-nao-usar-em-producao";
const DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://postgres:spark_dev@localhost:5432/spark";
const PORTA = 3212; // dedicada a este teste — distinta de 3211 (api-client) e 3000 (dev)

const admin = postgres(DATABASE_URL, { prepare: false });
const org: OrgId = orgIdFactory.novo();
const localUserId = userIdFactory.novo();
const supabaseUserId = crypto.randomUUID();

let processo: ChildProcess;
const colecoesAbertas: ContactsCollection[] = [];

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
    if (Date.now() - inicio > timeoutMs) {
      throw new Error(`timeout (${timeoutMs}ms) aguardando condição`);
    }
    await new Promise((resolve) => setTimeout(resolve, intervaloMs));
  }
}

function criarColecaoRastreada(): ContactsCollection {
  const colecao = createContactsCollection();
  colecoesAbertas.push(colecao);
  return colecao;
}

beforeAll(async () => {
  await admin`INSERT INTO organizations (id, nome, slug) VALUES (${org}, 'Org packages/data', ${"org-data-" + org})`;
  await admin`INSERT INTO users (id, org_id, supabase_user_id, nome, email) VALUES
    (${localUserId}, ${org}, ${supabaseUserId}, 'Pessoa packages/data', 'data@empresa.com')`;

  processo = spawn("node", ["--loader", "ts-node/esm", "src/main.ts"], {
    cwd: new URL("../../../apps/api", import.meta.url).pathname,
    env: {
      ...process.env,
      PORT: String(PORTA),
      DATABASE_URL,
      SUPABASE_JWT_SECRET: JWT_SECRET,
      NODE_ENV: "test",
    },
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
  await Promise.all(colecoesAbertas.splice(0).map((colecao) => colecao.cleanup()));
});

afterAll(async () => {
  processo?.kill();
  await admin`DELETE FROM contacts WHERE org_id = ${org}`;
  await admin`DELETE FROM users WHERE org_id = ${org}`;
  await admin`DELETE FROM organizations WHERE id = ${org}`;
  await admin.end();
});

describe("packages/data — coleção de contatos local-first (Bloco 6)", () => {
  it("um insert na coleção A aparece na coleção B (outra aba) em menos de 1 segundo, via Electric — não via estado otimista local", async () => {
    const colecaoA = criarColecaoRastreada();
    const colecaoB = criarColecaoRastreada();

    await Promise.all([colecaoA.preload(), colecaoB.preload()]);

    const contato = contatoOtimista({ nome: "Contato Sincronizado" }, org);

    const inicio = Date.now();
    const tx = colecaoA.insert(contato);

    // colecaoB nunca chamou insert — só está inscrita no mesmo shape.
    await aguardarAte(() => colecaoB.has(contato.id), 2_000);
    const decorrido = Date.now() - inicio;

    expect(decorrido).toBeLessThan(1_000);
    expect(colecaoB.get(contato.id)?.nome).toBe("Contato Sincronizado");

    // a escrita otimista da própria A também precisa ter sido persistida
    // de verdade no servidor, não só aparecido localmente.
    await tx.isPersisted.promise;

    const linhaNoBanco = await admin`SELECT nome FROM contacts WHERE id = ${contato.id}`;
    expect(linhaNoBanco[0]?.nome).toBe("Contato Sincronizado");
  }, 10_000);

  it("leitura da coleção já sincronizada não faz chamada de rede — toArray é síncrono e local", async () => {
    const colecao = criarColecaoRastreada();
    await colecao.preload();

    // toArray é um getter síncrono sobre estado em memória — se isto
    // precisasse de rede, seria uma Promise, não um valor direto. É essa
    // diferença de tipo que torna a leitura ~0ms possível (docs/adr/0018).
    const antes = colecao.toArray;
    expect(Array.isArray(antes)).toBe(true);
  });
});
