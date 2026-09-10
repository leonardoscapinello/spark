// packages/db — schema Drizzle + migrations (ADR-0005, ADR-0021, ADR-0022).
// Só apps/api, apps/worker e apps/scheduler importam isto (ADR-0026: o
// cliente lê via sync/Electric, não direto do banco).
export * from "./schema/index.js";
export * from "./client.js";
export * from "./roles.js";
