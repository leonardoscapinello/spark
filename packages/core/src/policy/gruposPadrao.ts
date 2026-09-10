import type { Capacidade } from "./capability.js";

/**
 * Os cinco grupos que toda organização nova recebe (docs/adr/0029). Hoje
 * Gerente e Agente saem idênticos — não é lacuna, é honesto: só existem
 * duas capacidades de negócio no sistema ainda (contacts:*). A distinção
 * real (ex.: Agente só nos próprios leads, Gerente no pipeline inteiro)
 * aparece quando `deals:*`/`pipelines:*` ganharem rota — nunca fabricar
 * diferença artificial antes de existir capacidade pra diferenciar.
 */
export const GRUPOS_PADRAO: ReadonlyArray<{ nome: string; capacidades: readonly Capacidade[] }> = [
  { nome: "Proprietário", capacidades: ["contacts:read", "contacts:write", "permission_groups:manage"] },
  { nome: "Administrador", capacidades: ["contacts:read", "contacts:write", "permission_groups:manage"] },
  { nome: "Gerente", capacidades: ["contacts:read", "contacts:write"] },
  { nome: "Agente", capacidades: ["contacts:read", "contacts:write"] },
  { nome: "Visualizador", capacidades: ["contacts:read"] },
];
