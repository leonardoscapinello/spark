/**
 * Toda capacidade é um par `recurso:ação` (docs/adr/0029). Lista cresce
 * junto com o que existe de verdade — nunca adiantada para um recurso que
 * ainda não tem rota nenhuma (deals, automation etc. entram quando
 * ganharem endpoint, não antes).
 */
export const CAPACIDADES = [
  "contacts:read",
  "contacts:write",
  "permission_groups:manage",
  "pipelines:manage",
  "deals:read",
  "deals:write",
  "deals:move",
  "activities:read",
  "activities:write",
] as const;

export type Capacidade = (typeof CAPACIDADES)[number];

export function ehCapacidade(valor: string): valor is Capacidade {
  return (CAPACIDADES as readonly string[]).includes(valor);
}
