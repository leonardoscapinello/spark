import { FetchError, snakeCamelMapper } from "@electric-sql/client";
import type { ShapeStreamOptions } from "@electric-sql/client";
import { getSparkApiBaseUrl, getSparkAuthToken, refreshSparkAuthToken } from "@spark/api-client";

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
    parser: SPARK_PARSER,
    headers: { authorization: () => { const token = getSparkAuthToken(); return token ? `Bearer ${token}` : ""; } },
    onError: async (error: Error) => {
      if (error instanceof FetchError && error.status === 401) {
        const token = await refreshSparkAuthToken();
        return token ? { headers: { authorization: `Bearer ${token}` } } : undefined;
      }
      // Rede e servidor indisponíveis são recuperáveis; os demais 4xx são
      // respostas definitivas e não devem entrar num ciclo de tentativas.
      if (!(error instanceof FetchError) || error.status >= 500) return {};
      return undefined;
    },
  };
}

/**
 * O Electric entrega cada coluna como o texto que veio do Postgres; o schema
 * Zod da coleção só transforma **escrita local**, nunca leitura sincronizada.
 * Sem isto, um `jsonb` chega como string e `field.options.map` estoura na tela
 * — foi exatamente o que aconteceu com as opções de um campo personalizado.
 *
 * Um parser por tipo de coluna, aqui, resolve para todas as coleções.
 */
/* O tipo `Parser` do cliente não é exportado; tirado da própria opção. */
type SparkParser = NonNullable<ShapeStreamOptions["parser"]>;

/** Valor inválido não derruba a tela: volta como veio, e quem lê decide. */
const parseJson: SparkParser[string] = (value) => {
  if (typeof value !== "string") return value;
  try { return JSON.parse(value) as ReturnType<SparkParser[string]>; } catch { return value; }
};
const SPARK_PARSER: SparkParser = {
  jsonb: parseJson,
  json: parseJson,
};
