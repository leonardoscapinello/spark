import type { Capacidade } from "./capability.js";

/**
 * Único ponto de checagem de capacidade do sistema inteiro — API e
 * cliente chamam esta função, nunca comparam papel/string na mão
 * (docs/adr/0029). Usuário sem nenhum grupo nega por padrão.
 *
 * Parâmetro é estrutural (não `Pick<PermissionGroup,...>`) de propósito:
 * aceita tanto o array mutável que vem de PermissionGroupSchema quanto o
 * `as const` readonly que GRUPOS_PADRAO e os testes usam.
 */
export function temCapacidade(
  grupos: readonly { capacidades: readonly Capacidade[] }[],
  capacidade: Capacidade,
): boolean {
  return grupos.some((grupo) => grupo.capacidades.includes(capacidade));
}
