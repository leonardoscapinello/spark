import { snakeCamelMapper } from "@electric-sql/client";
import { getSparkApiBaseUrl, getSparkAuthToken } from "@spark/api-client";

/**
 * Opções de shape de TODAS as coleções — um lugar só (ADR-0020 vale para
 * dado também: corrigir aqui corrige as 27).
 *
 * `liveSse`: atualizações chegam por Server-Sent Events — um fluxo aberto
 * por tabela e zero requisições enquanto nada muda — em vez do long-poll,
 * que reabria uma requisição a cada ~20 s por tabela mesmo com o sistema
 * parado. É o modelo push (docs/adr/0017: sistema saudável, não cansativo).
 * O proxy de shapes (apps/api sync) repassa o fluxo sem bufferizar.
 */
export function sparkShapeOptions(table: string) {
  return {
    url: `${getSparkApiBaseUrl()}/v1/shapes/${table}`,
    liveSse: true,
    columnMapper: snakeCamelMapper(),
    headers: { authorization: () => { const token = getSparkAuthToken(); return token ? `Bearer ${token}` : ""; } },
  };
}
