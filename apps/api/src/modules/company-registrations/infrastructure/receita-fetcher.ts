import { Injectable } from "@nestjs/common";
import { parseReceitaPayload, type CompanyRegistrationParts, type ReceitaPayload } from "@spark/core";

/**
 * Busca o cadastro de um CNPJ na fonte pública.
 *
 * A fonte padrão é o **Minha Receita** (código aberto, auto-hospedável, sem
 * chave). A **BrasilAPI** devolve exatamente as mesmas 48 chaves, o que faz das
 * duas intercambiáveis por `RECEITA_CNPJ_URL` — e permite apontar para uma
 * instância própria quando o volume justificar, sem tocar em código.
 *
 * Endereço com `{cnpj}` é substituído; sem o marcador, o CNPJ é acrescentado ao
 * fim. Foi escrito assim porque as duas fontes diferem só no caminho.
 */
const DEFAULT_SOURCE = "https://minhareceita.org/{cnpj}";
const TIMEOUT_MS = 8_000;

export class ReceitaLookupError extends Error {
  constructor(message: string, readonly httpStatus: number | null, readonly notFound = false) {
    super(message);
    this.name = "ReceitaLookupError";
  }
}

export interface ReceitaLookup extends CompanyRegistrationParts {
  source: string;
  httpStatus: number;
}

@Injectable()
export class ReceitaFetcher {
  private readonly template = process.env.RECEITA_CNPJ_URL ?? DEFAULT_SOURCE;

  /** O endereço da fonte, sem o CNPJ — é o que fica gravado em `source`. */
  get source(): string {
    return this.template.replace("{cnpj}", "").replace(/\/+$/, "");
  }

  async fetch(taxId: string): Promise<ReceitaLookup> {
    const url = this.template.includes("{cnpj}")
      ? this.template.replace("{cnpj}", taxId)
      : `${this.template.replace(/\/+$/, "")}/${taxId}`;

    let response: Response;
    try {
      response = await fetch(url, {
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { accept: "application/json", "user-agent": "SparkCompanyRegistry/1.0" },
      });
    } catch (cause) {
      // Rede fora, DNS, prazo estourado: recuperável, e quem chama vai tentar
      // de novo mais tarde com espera crescente.
      throw new ReceitaLookupError(`A consulta ao CNPJ não completou: ${(cause as Error).message}`, null);
    }

    // 404 é resposta definitiva e diferente de falha: o CNPJ não existe na
    // base. Guardar isso evita repetir a consulta a cada abertura da tela.
    if (response.status === 404) throw new ReceitaLookupError("CNPJ não encontrado na base da Receita Federal.", 404, true);
    if (response.status === 429) throw new ReceitaLookupError("A fonte pediu para esperar antes da próxima consulta.", 429);
    if (!response.ok) throw new ReceitaLookupError(`A fonte respondeu ${response.status}.`, response.status);

    let payload: ReceitaPayload;
    try {
      payload = (await response.json()) as ReceitaPayload;
    } catch {
      throw new ReceitaLookupError("A fonte respondeu algo que não é JSON.", response.status);
    }

    return { ...parseReceitaPayload(taxId, payload), source: this.source, httpStatus: response.status };
  }
}
