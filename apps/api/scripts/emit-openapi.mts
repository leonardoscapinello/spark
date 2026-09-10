/**
 * Gera packages/contracts/openapi.json a partir dos controllers reais da
 * API — nenhum arquivo de contrato escrito à mão (docs/adr/0004). Sobe o
 * app em memória (sem listen), extrai o documento, escreve, sai. Chamado
 * por `pnpm gen:api` (raiz) → packages/contracts#gen:openapi → aqui.
 */
import { writeFile, mkdir } from "node:fs/promises";
import "reflect-metadata";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { cleanupOpenApiDoc } from "nestjs-zod";
import { bootstrap } from "../src/main.js";

/**
 * cleanupOpenApiDoc já converte `anyOf: [T, {type:"null"}]` (a forma que o
 * zod v4 usa pra campo nullable simples) em `nullable: true`. Mas campos
 * nullable que passam por `.transform()` antes — nosso padrão em todo
 * campo de tipo marcado (zEmail, zTelefone, zodHelpers.ts) — o zod v4
 * emite como `type: ["string","null"]` (array), um caminho que o
 * conversor da nestjs-zod não cobre. Doc declara openapi 3.0.0, que exige
 * `type` como string única; array sobrevivendo até aqui quebra a
 * validação do orval. Mesma normalização, só que pro caso que falta.
 */
function normalizarTypeNullable(no: unknown): unknown {
  if (Array.isArray(no)) return no.map(normalizarTypeNullable);
  if (no === null || typeof no !== "object") return no;

  const objeto = no as Record<string, unknown>;
  const resultado: Record<string, unknown> = {};
  for (const [chave, valor] of Object.entries(objeto)) {
    resultado[chave] = normalizarTypeNullable(valor);
  }

  if (Array.isArray(resultado["type"]) && resultado["type"].includes("null")) {
    const tiposRestantes = resultado["type"].filter((t) => t !== "null");
    if (tiposRestantes.length === 1) {
      resultado["type"] = tiposRestantes[0];
      resultado["nullable"] = true;
    }
  }

  return resultado;
}

async function main() {
  const app = await bootstrap();

  const config = new DocumentBuilder()
    .setTitle("Spark API")
    .setDescription("Contrato gerado dos controllers — ver docs/adr/0004-contrato-openapi-primeiro.md")
    .setVersion("1.0")
    .addBearerAuth()
    .build();

  const documento = normalizarTypeNullable(
    cleanupOpenApiDoc(SwaggerModule.createDocument(app, config)),
  ) as ReturnType<typeof cleanupOpenApiDoc>;

  const destino = new URL("../../../packages/contracts/openapi.json", import.meta.url);
  await mkdir(new URL("../../../packages/contracts", import.meta.url), { recursive: true });
  await writeFile(destino, JSON.stringify(documento, null, 2) + "\n");

  console.log(`✓ openapi.json gerado — ${Object.keys(documento.paths ?? {}).length} rota(s)`);

  await app.close();
  process.exit(0);
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
