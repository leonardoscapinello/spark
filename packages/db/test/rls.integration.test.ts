/**
 * A prova que o Bloco 4 exige (docs/arquitetura/fase-0.md): RLS bloqueia
 * leitura de outra organização de verdade, não só na teoria do ADR.
 *
 * Precisa do Postgres local rodando (docker compose up -d postgres) com a
 * migration aplicada (pnpm db:migrate) — CI faz os dois antes deste teste.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import postgres from "postgres";
import { orgId as orgIdFactory, contactId as contactIdFactory } from "@spark/core";

const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://postgres:spark_dev@localhost:5432/spark";
const APP_DATABASE_URL = DATABASE_URL.replace(
  /postgres:([^@]+)@/,
  "app_user:app_user_dev_password@",
);

const admin = postgres(DATABASE_URL, { prepare: false });
const appUser = postgres(APP_DATABASE_URL, { prepare: false });

const orgA = orgIdFactory.novo();
const orgB = orgIdFactory.novo();
const contatoOrgA = contactIdFactory.novo();
const contatoOrgB = contactIdFactory.novo();

beforeAll(async () => {
  // seed como admin — tem BYPASS RLS (ver o papel `postgres` nesta imagem
  // Supabase), então enxerga e escreve as duas organizações de uma vez.
  await admin`INSERT INTO organizations (id, nome, slug) VALUES
    (${orgA}, 'Organização A', ${"org-a-" + orgA}),
    (${orgB}, 'Organização B', ${"org-b-" + orgB})`;

  await admin`INSERT INTO contacts (id, org_id, nome) VALUES
    (${contatoOrgA}, ${orgA}, 'Contato da A'),
    (${contatoOrgB}, ${orgB}, 'Contato da B')`;
});

afterAll(async () => {
  await admin`DELETE FROM contacts WHERE org_id IN (${orgA}, ${orgB})`;
  await admin`DELETE FROM organizations WHERE id IN (${orgA}, ${orgB})`;
  await admin.end();
  await appUser.end();
});

describe("RLS — isolamento entre organizações (docs/adr/0022, docs/adr/0026)", () => {
  it("com o contexto da org A, só vê o contato da org A", async () => {
    const linhas = await appUser.begin(async (tx) => {
      await tx.unsafe(`SET LOCAL app.current_org_id = '${orgA}'`);
      return tx`SELECT id, nome FROM contacts ORDER BY nome`;
    });
    expect(linhas).toHaveLength(1);
    expect(linhas[0]?.id).toBe(contatoOrgA);
  });

  it("com o contexto da org B, só vê o contato da org B — não o da A", async () => {
    const linhas = await appUser.begin(async (tx) => {
      await tx.unsafe(`SET LOCAL app.current_org_id = '${orgB}'`);
      return tx`SELECT id, nome FROM contacts ORDER BY nome`;
    });
    expect(linhas).toHaveLength(1);
    expect(linhas[0]?.id).toBe(contatoOrgB);
  });

  it("sem nenhum contexto setado, não vê NADA — nega por padrão, não libera tudo", async () => {
    // Conexão própria, isolada das outras — de propósito. Numa conexão
    // reciclada do pool que já viu `SET LOCAL app.current_org_id` alguma
    // vez, o Postgres passa a tratar essa GUC customizada como "vista", e
    // current_setting(..., true) volta '' (string vazia) em vez de NULL
    // depois que a transação que setou termina — não é "nunca definida" de
    // verdade. Isso por si só já prova o ponto: a política nem aceita ''
    // como uuid (erro, não libera linha nenhuma) — mas o teste de "nunca foi
    // setado" precisa de uma sessão que realmente nunca viu a GUC.
    const conexaoIsolada = postgres(APP_DATABASE_URL, { prepare: false, max: 1 });
    try {
      const linhas = await conexaoIsolada.begin(async (tx) => tx`SELECT id FROM contacts`);
      expect(linhas).toHaveLength(0);
    } finally {
      await conexaoIsolada.end();
    }
  });

  it("mesmo tentando, uma query não filtrada por org_id não vaza a outra organização", async () => {
    // o ponto do RLS: mesmo que o código da aplicação "esqueça" o WHERE
    // org_id = ..., o banco nunca devolve linha de fora do contexto.
    const linhas = await appUser.begin(async (tx) => {
      await tx.unsafe(`SET LOCAL app.current_org_id = '${orgA}'`);
      return tx`SELECT * FROM contacts`; // sem WHERE nenhum, de propósito
    });
    expect(linhas.every((l) => l.org_id === orgA)).toBe(true);
    expect(linhas.some((l) => l.id === contatoOrgB)).toBe(false);
  });

  it("organizations também isola — org A não vê a linha da org B", async () => {
    const linhas = await appUser.begin(async (tx) => {
      await tx.unsafe(`SET LOCAL app.current_org_id = '${orgA}'`);
      return tx`SELECT id FROM organizations`;
    });
    expect(linhas).toHaveLength(1);
    expect(linhas[0]?.id).toBe(orgA);
  });

  it("o admin (bypass RLS) continua vendo as duas — é o caminho de migration/suporte, não o de negócio", async () => {
    const linhas = await admin`SELECT id FROM contacts WHERE org_id IN (${orgA}, ${orgB})`;
    expect(linhas).toHaveLength(2);
  });
});
