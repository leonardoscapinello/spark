/**
 * Mutator do orval — todo request gerado passa por aqui. Um lugar só pra
 * base URL, header de auth e tratamento de erro (docs/adr/0004, 0026).
 *
 * Base URL e token são configurados por setter, nunca lidos direto de
 * `process.env` no módulo — isto roda em quatro alvos (web, desktop,
 * mobile, e testes Node), e `process.env` não existe do mesmo jeito num
 * bundle de navegador. Cada app chama os setters uma vez, na inicialização.
 */
import axios, { type AxiosRequestConfig } from "axios";

const instance = axios.create({ baseURL: "http://localhost:3000" });

let getToken: (() => string | null) | undefined;

/** Chamado uma vez por app, com a fonte real do JWT (ex.: sessão da Supabase Auth). */
export function setSparkAuthTokenProvider(fn: () => string | null): void {
  getToken = fn;
}

/** Chamado uma vez por app — em dev local já vem certo (localhost:3000). */
export function setSparkApiBaseUrl(baseUrl: string): void {
  instance.defaults.baseURL = baseUrl;
}

export async function sparkHttpClient<T>(config: AxiosRequestConfig): Promise<T> {
  const token = getToken?.();
  const res = await instance.request<T>({
    ...config,
    headers: {
      ...config.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  return res.data;
}
