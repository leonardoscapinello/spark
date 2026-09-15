#!/usr/bin/env node
/**
 * Serviços que `pnpm dev` precisa ter de pé antes de subir os apps.
 *
 * Existe porque a falta deles é INVISÍVEL na tela. Sem o Electric, toda
 * shape responde 500 e a área de trabalho fica em esqueleto; sem o gateway
 * HTTP/2, a tela aponta para uma porta que ninguém atende e volta para o
 * login. Nos dois casos o navegador não diz o que faltou — e a pessoa passa
 * a sessão inteira procurando um bug que não existe.
 *
 * Aqui a checagem é feita uma vez, em texto, antes de qualquer app subir.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ELECTRIC_URL = lerEnv("apps/api/.env", "ELECTRIC_URL") ?? "http://localhost:3011";

/** Lê uma chave de um `.env` sem dependência — é a única coisa que precisamos dele. */
function lerEnv(caminho, chave) {
  const arquivo = resolve(raiz, caminho);
  if (!existsSync(arquivo)) return null;
  for (const linha of readFileSync(arquivo, "utf8").split("\n")) {
    const [nome, ...resto] = linha.split("=");
    if (nome?.trim() === chave) return resto.join("=").trim();
  }
  return null;
}

function falhar(titulo, comoResolver) {
  console.error(`\n  ${titulo}\n`);
  for (const passo of comoResolver) console.error(`    ${passo}`);
  console.error("");
  process.exit(1);
}

function avisar(titulo, comoResolver) {
  console.warn(`\n  ${titulo}\n`);
  for (const passo of comoResolver) console.warn(`    ${passo}`);
  console.warn("");
}

function temNoCaminho(binario) {
  try {
    execFileSync("/bin/sh", ["-c", `command -v ${binario}`], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/* Electric e Valkey vêm do docker-compose da raiz. Subir é idempotente:
 * container já de pé não reinicia. */
function subirContainers() {
  if (!temNoCaminho("docker")) {
    falhar("Docker não está instalado, e o Electric roda nele.", ["Instale o Docker Desktop e abra-o antes de `pnpm dev`."]);
  }
  try {
    execFileSync("docker", ["compose", "up", "-d"], { cwd: raiz, stdio: "inherit" });
  } catch {
    falhar("`docker compose up -d` falhou.", [
      "O Docker Desktop está aberto?",
      "ELECTRIC_DATABASE_URL está preenchido no .env da raiz?",
    ]);
  }
}

/** O container sobe em segundos, mas só responde depois de abrir a réplica. */
async function esperarElectric() {
  const limite = Date.now() + 90_000;
  while (Date.now() < limite) {
    try {
      const resposta = await fetch(new URL("/v1/health", ELECTRIC_URL));
      if (resposta.ok) {
        const { status } = await resposta.json();
        if (status === "active") return;
      }
    } catch {
      // ainda subindo
    }
    await new Promise((pronto) => setTimeout(pronto, 1_000));
  }
  falhar(`Electric não respondeu em ${ELECTRIC_URL} depois de 90s.`, [
    "docker logs --tail 40 spark-dev-electric-app-1",
    "Normalmente é ELECTRIC_DATABASE_URL apontando para um Postgres que não aceita a conexão.",
  ]);
}

/* O gateway sobe junto com os apps (`turbo run dev`), mas só funciona com o
 * Caddy instalado e a CA de desenvolvimento confiável. Sem isso a tela fala
 * com uma porta que não atende — e o sintoma é «nada carrega», não um erro
 * de certificado. Aviso, não falha: o `caddy trust` é decisão de quem é dono
 * da máquina, e pede autenticação. */
function conferirGateway() {
  if (!temNoCaminho("caddy")) {
    avisar("Caddy não encontrado — sem ele não há HTTP/2 local, e seis conexões travam o app.", [
      "brew install caddy",
      "caddy trust    # pede autenticação; veja apps/dev-gateway/README.md",
    ]);
    return;
  }
  if (process.platform !== "darwin") return;
  try {
    const confianca = execFileSync("security", ["dump-trust-settings"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    if (confianca.includes("Caddy Local Authority")) return;
  } catch {
    // Sem nenhuma confiança registrada o comando sai diferente de zero.
  }
  avisar("A CA de desenvolvimento do Caddy não está confiável neste Mac.", [
    "caddy trust    # pede autenticação; veja apps/dev-gateway/README.md",
  ]);
}

subirContainers();
await esperarElectric();
conferirGateway();
console.log(`  Electric ativo em ${ELECTRIC_URL}. Subindo os apps.\n`);
