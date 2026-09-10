/**
 * Sessão do dev-login, só no cliente (sufixo .client.ts — nunca entra no
 * bundle do servidor: localStorage não existe em Node, e RR8 remove
 * arquivos .client.* da build de SSR automaticamente).
 *
 * Login de produção de verdade (Supabase Auth, sessão em cookie
 * httpOnly, leitura no servidor) é decisão maior — cookie, CSRF, refresh
 * — que não faz parte do escopo da Fase 0 (docs/arquitetura/fase-0.md,
 * Bloco 7). Isto é deliberadamente o caminho mais simples que já prova a
 * arquitetura real (mesmo guard, mesmo JWT, mesma RLS do lado do
 * servidor — só a EMISSÃO do token é dev-only, ver
 * apps/api/src/modules/dev/presentation/dev-login.controller.ts).
 */
import type { OrgId } from "@spark/core";
import { setSparkApiBaseUrl, setSparkAuthTokenProvider } from "@spark/api-client";

const CHAVE_SESSAO = "spark_dev_sessao";

// import.meta.env.VITE_API_BASE_URL fica vazio em dev local — o default
// de packages/api-client/src/http-client.ts (http://localhost:3000) já
// é o correto. Staging/produção define a env var no build.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
if (API_BASE_URL) setSparkApiBaseUrl(API_BASE_URL);

interface Sessao {
  token: string;
  orgId: OrgId;
  userId: string;
}

export function obterSessao(): Sessao | null {
  try {
    const bruto = localStorage.getItem(CHAVE_SESSAO);
    return bruto ? (JSON.parse(bruto) as Sessao) : null;
  } catch {
    return null;
  }
}

export function obterToken(): string | null {
  return obterSessao()?.token ?? null;
}

export function salvarSessao(sessao: Sessao): void {
  localStorage.setItem(CHAVE_SESSAO, JSON.stringify(sessao));
  setSparkAuthTokenProvider(obterToken);
}

export function limparSessao(): void {
  localStorage.removeItem(CHAVE_SESSAO);
}

// roda uma vez, na primeira importação deste módulo (entry.client.tsx) —
// se já existe sessão de uma visita anterior, o provider já sai
// configurado antes de qualquer loader de rota rodar.
setSparkAuthTokenProvider(obterToken);
