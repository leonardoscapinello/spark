/**
 * A prova final do Bloco 5 (docs/arquitetura/fase-0.md): "o cliente gerado
 * tipa a resposta sem nenhum DTO escrito à mão". Sobe apps/api como
 * PROCESSO SEPARADO de verdade (não importado em memória) — é assim que
 * qualquer app real (web/desktop/mobile) fala com a API, e é a única forma
 * confiável de testar isto: importar main.ts de dentro do processo do
 * Vitest de OUTRO pacote não preserva a metadata de decorator que o DI do
 * NestJS precisa (cada pacote tem seu próprio transform TS/esbuild — ver
 * commit desta mudança e apps/api/package.json, que roda via ts-node, não
 * tsx/esbuild, pelo mesmo motivo).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { spawn, type ChildProcess } from "node:child_process";
import { SignJWT } from "jose";
import postgres from "postgres";
import { UserSchema, orgId as orgIdFactory, userId as userIdFactory } from "@spark/core";
import { meControllerMe, type UserDto } from "../src/generated.js";
import { setSparkApiBaseUrl, setSparkAuthTokenProvider } from "../src/http-client.js";

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET ?? "dev-only-local-secret-nao-usar-em-producao";
const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://postgres:spark_dev@localhost:5432/spark";
const PORTA = 3211; // porta fixa dedicada a este teste — não a de dev (3000)

const admin = postgres(DATABASE_URL, { prepare: false });
const org = orgIdFactory.novo();
const localUserId = userIdFactory.novo();
const supabaseUserId = crypto.randomUUID();

let processo: ChildProcess;

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

beforeAll(async () => {
  await admin`INSERT INTO organizations (id, nome, slug) VALUES (${org}, 'Org cliente gerado', ${"org-client-" + org})`;
  await admin`INSERT INTO users (id, org_id, supabase_user_id, nome, email) VALUES
    (${localUserId}, ${org}, ${supabaseUserId}, 'Pessoa Via Cliente Gerado', 'gerado@empresa.com')`;

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
}, 20_000);

afterAll(async () => {
  processo?.kill();
  await admin`DELETE FROM users WHERE org_id = ${org}`;
  await admin`DELETE FROM organizations WHERE id = ${org}`;
  await admin.end();
});

async function jwtValido(): Promise<string> {
  const chave = new TextEncoder().encode(JWT_SECRET);
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(supabaseUserId)
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(chave);
}

describe("cliente gerado (orval) — packages/api-client nunca declara UserDto à mão", () => {
  it("meControllerMe() chama a API real (processo separado) e devolve o perfil tipado", async () => {
    const token = await jwtValido();
    setSparkAuthTokenProvider(() => token);

    const perfil: UserDto = await meControllerMe();

    expect(perfil.id).toBe(localUserId);
    expect(perfil.orgId).toBe(org);
    expect(perfil.nome).toBe("Pessoa Via Cliente Gerado");
    expect(perfil.email).toBe("gerado@empresa.com");

    // UserDto (vindo do OpenAPI) tem id/orgId como string pura — JSON Schema
    // não expressa tipo marcado (UserId, OrgId). Isso não é bug: é o limite
    // real de qualquer codegen baseado em OpenAPI. A ponte certa NÃO é um
    // cast estrutural — é revalidar pela MESMA fonte Zod que já define a
    // marca (docs/adr/0004, docs/adr/0019). Se UserDto e UserSchema
    // divergissem em formato, isto lançaria em runtime, não silenciaria.
    const comBranding = UserSchema.parse(perfil);
    expect(comBranding.supabaseUserId).toBe(supabaseUserId);
  });
});
