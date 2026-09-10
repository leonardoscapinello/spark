import { CAPACIDADES, type Capacidade } from "./capability.js";

/**
 * Os cinco grupos que toda organização nova recebe (docs/adr/0029).
 * Gerente x Agente: a diferença real é `pipelines:manage` — Gerente
 * configura estágio e funil, Agente só trabalha o negócio dentro do que
 * já existe. Visibilidade por registro (Agente só nos próprios leads)
 * fica fora do v1 por decisão do próprio ADR-0029 ("ACL por registro
 * individual... descartado como v1") — a diferença hoje é só de
 * capacidade, não de escopo de dado.
 */
export const GRUPOS_PADRAO: ReadonlyArray<{ nome: string; capacidades: readonly Capacidade[] }> = [
  { nome: "Proprietário", capacidades: CAPACIDADES },
  { nome: "Administrador", capacidades: CAPACIDADES },
  {
    nome: "Gerente",
    capacidades: [
      "contacts:read",
      "contacts:write",
      "pipelines:manage",
      "deals:read",
      "deals:write",
      "deals:move",
      "activities:read",
      "activities:write",
    ],
  },
  {
    nome: "Agente",
    capacidades: [
      "contacts:read",
      "contacts:write",
      "deals:read",
      "deals:write",
      "deals:move",
      "activities:read",
      "activities:write",
    ],
  },
  { nome: "Visualizador", capacidades: ["contacts:read", "deals:read", "activities:read"] },
];
