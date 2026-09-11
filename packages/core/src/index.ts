// packages/core — a única fonte de verdade das regras de domínio do Spark.
// Nada aqui faz I/O. Nada aqui importa de apps/, db/ ou ui-*/.
// Ver docs/adr/0019-nucleo-compartilhado.md.

export * from "./money/index.js";
export * from "./format/index.js";
export * from "./identity/index.js";
export * from "./errors/index.js";
export * from "./schema/index.js";
export * from "./policy/index.js";
export * from "./search/index.js";
export * from "./import/index.js";
export * from "./analytics/index.js";
export * from "./automation/index.js";
export * from "./catalog/index.js";
export * from "./forms/index.js";
export * from "./inbox/index.js";
