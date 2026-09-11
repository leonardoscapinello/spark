/**
 * Bits shared across tables — but each table still declares its own field
 * names, mirroring its corresponding Zod schema in packages/core
 * (docs/adr/0019: "one Zod schema... every artifact derives from it,
 * including the Drizzle schema"). There's no generic `tenantColumns()`
 * helper because entities don't agree on a field name — Organization uses
 * `archivedAt`, Contact uses `deletedAt`, and Organization doesn't even
 * have `orgId` (it IS the tenant). Forcing a single helper would hide that
 * real difference.
 *
 * The UUID v7 is generated client-side (`$defaultFn`), not by the
 * database — Postgres 15 (our local image, and what Supabase runs today)
 * has no native generator for it; that only lands in v18. Generating it
 * app-side also keeps ADR-0019's rule: code creates identifiers, not the database.
 */
import { v7 as uuidv7 } from "uuid";
import { uuid } from "drizzle-orm/pg-core";

export function idColumn(name = "id") {
  return uuid(name).primaryKey().$defaultFn(() => uuidv7());
}
