/**
 * Pedaços repetidos entre tabelas — mas cada tabela ainda declara seus
 * próprios nomes de campo, espelhando o schema Zod correspondente em
 * packages/core (docs/adr/0019: "um schema Zod... dele derivam TODOS os
 * artefatos, inclusive o schema Drizzle"). Não existe um `tenantColumns()`
 * genérico porque as entidades não concordam em nome de campo — Organization
 * usa `arquivadoEm`, Contact usa `excluidoEm`, e Organization nem tem `orgId`
 * (ela É o tenant). Forçar um helper único esconderia essa diferença real.
 *
 * O UUID v7 é gerado no cliente (`$defaultFn`), não no banco — o Postgres 15
 * (nossa imagem local e o que o Supabase roda hoje) não tem gerador nativo;
 * isso só chega na v18. Gerar no app também mantém a regra do ADR-0019:
 * quem cria identificador é o código, não o banco.
 */
import { v7 as uuidv7 } from "uuid";
import { uuid } from "drizzle-orm/pg-core";

export function idColumn(name = "id") {
  return uuid(name).primaryKey().$defaultFn(() => uuidv7());
}
