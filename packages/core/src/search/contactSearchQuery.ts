import { normalizeSearchText } from "./contactSearch.js";

const MAX_TERMS = 8;

/**
 * Texto digitado → tsquery do Postgres. É o segundo caminho de leitura do
 * ADR-0026: a tela filtra a coleção local com contactMatches; a API (e os
 * relatórios) filtram no banco com o índice GIN — e os dois precisam
 * entender o texto do mesmo jeito, por isso a normalização é a mesma.
 *
 * Cada termo vira prefixo (`jose:*`) e os termos se ligam por AND: quem
 * digita "jose con" quer José Conceição, não qualquer José. Só letras e
 * números sobrevivem — qualquer operador de tsquery (& | ! : ( ) <) vindo
 * do usuário some aqui, então o texto nunca chega ao Postgres como sintaxe.
 *
 * Devolve null quando não sobra termo nenhum: a chamada trata como "sem
 * busca", nunca como "nada combina".
 */
export function buildContactSearchQuery(text: string): string | null {
  const terms = normalizeSearchText(text)
    .split(/\s+/)
    .map((term) => term.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter((term) => term.length > 0)
    .slice(0, MAX_TERMS);
  if (terms.length === 0) return null;
  return terms.map((term) => `${term}:*`).join(" & ");
}
