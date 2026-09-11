/**
 * Whitelist of tables syncable via Electric — never "all tables
 * automatically" (docs/adr/0018: "local-first isn't downloading
 * everything"). A new table joins this list only after:
 *   1. Being in the PUBLICATION (packages/db/migrations/000X_*.sql)
 *   2. Having the right isolation column mapped below
 *
 * `column` is what goes into the shape's WHERE — never coming from the
 * client (docs/adr/0026: "a badly written shape is a data leak between
 * organizations — security risk #1").
 */
import type { SyncResource } from "@spark/core";

export interface ShapeTableConfig {
  column: "org_id" | "id"; // "id" only makes sense for organizations (syncs its own row)
}

export const SHAPE_TABLES: Readonly<Record<SyncResource, ShapeTableConfig>> = {
  organizations: { column: "id" },
  contacts: { column: "org_id" },
  companies: { column: "org_id" },
  pipelines: { column: "org_id" },
  stages: { column: "org_id" },
  deals: { column: "org_id" },
  activities: { column: "org_id" },
  events: { column: "org_id" },
  identities: { column: "org_id" },
  users: { column: "org_id" },
  conversations: { column: "org_id" },
  messages: { column: "org_id" },
  automations: { column: "org_id" },
  automation_versions: { column: "org_id" },
  automation_runs: { column: "org_id" },
  automation_run_steps: { column: "org_id" },
  integration_connections: { column: "org_id" },
  files: { column: "org_id" },
  products: { column: "org_id" },
  product_variants: { column: "org_id" },
  discount_rules: { column: "org_id" },
};

export function isSyncableTable(table: string): table is SyncResource {
  return Object.hasOwn(SHAPE_TABLES, table);
}
