// packages/db — Drizzle schema + migrations (ADR-0005, ADR-0021, ADR-0022).
// Only apps/api, apps/worker and apps/scheduler import this (ADR-0026: the
// client reads via sync/Electric, never straight from the database).
export * from "./schema/index.js";
export * from "./client.js";
export * from "./roles.js";
