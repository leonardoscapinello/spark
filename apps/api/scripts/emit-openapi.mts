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

async function main() {
  const app = await bootstrap();

  const config = new DocumentBuilder()
    .setTitle("Spark API")
    .setDescription("Contrato gerado dos controllers — ver docs/adr/0004-contrato-openapi-primeiro.md")
    .setVersion("1.0")
    .addBearerAuth()
    .build();

  const documento = cleanupOpenApiDoc(SwaggerModule.createDocument(app, config));

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
