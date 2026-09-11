-- Hand-written, outside drizzle-kit's journal (same pattern documented in
-- packages/db/README.md) — CREATE PUBLICATION isn't something Drizzle's
-- DSL generates. Every table Electric syncs to the client must be listed
-- here AND in apps/api/src/modules/sync/application/shape-tables.ts's
-- SHAPE_TABLES allowlist (docs/adr/0018, docs/adr/0026: sync is a
-- filtered read path, never "all tables automatically").
CREATE PUBLICATION electric_publication_default FOR TABLE
  organizations,
  contacts,
  pipelines,
  stages,
  deals,
  activities;
