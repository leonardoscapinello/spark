/**
 * Lista branca de tabelas sincronizáveis via Electric — nunca "todas as
 * tabelas automaticamente" (docs/adr/0018: "local-first não é baixar
 * tudo"). Tabela nova entra aqui só depois de:
 *   1. Estar na PUBLICATION (packages/db/migrations/000X_*.sql)
 *   2. Ter a coluna de isolamento certa mapeada abaixo
 *
 * `coluna` é o que entra no WHERE do shape — nunca vindo do cliente
 * (docs/adr/0026: "shape mal escrito é vazamento de dado entre
 * organizações — risco de segurança nº 1").
 */
export interface ShapeTableConfig {
  coluna: "org_id" | "id"; // "id" só faz sentido pra organizations (sincroniza a própria linha)
}

export const SHAPE_TABLES: Readonly<Record<string, ShapeTableConfig>> = {
  organizations: { coluna: "id" },
  contacts: { coluna: "org_id" },
  pipelines: { coluna: "org_id" },
  stages: { coluna: "org_id" },
  deals: { coluna: "org_id" },
  activities: { coluna: "org_id" },
};

export function isTabelaSincronizavel(tabela: string): tabela is keyof typeof SHAPE_TABLES {
  return Object.hasOwn(SHAPE_TABLES, tabela);
}
