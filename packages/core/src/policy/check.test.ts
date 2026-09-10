import { describe, expect, it } from "vitest";
import { temCapacidade } from "./check.js";
import { GRUPOS_PADRAO } from "./gruposPadrao.js";

describe("temCapacidade — única checagem de permissão do sistema (docs/adr/0029)", () => {
  it("concede quando algum grupo do usuário tem a capacidade", () => {
    const grupos = [{ capacidades: ["contacts:read"] as const }];
    expect(temCapacidade(grupos, "contacts:read")).toBe(true);
  });

  it("nega quando nenhum grupo tem a capacidade", () => {
    const grupos = [{ capacidades: ["contacts:read"] as const }];
    expect(temCapacidade(grupos, "contacts:write")).toBe(false);
  });

  it("nega por padrão quando o usuário não tem grupo nenhum", () => {
    expect(temCapacidade([], "contacts:read")).toBe(false);
  });

  it("concede se QUALQUER um dos vários grupos do usuário tiver a capacidade", () => {
    const grupos = [{ capacidades: ["contacts:read"] as const }, { capacidades: ["permission_groups:manage"] as const }];
    expect(temCapacidade(grupos, "permission_groups:manage")).toBe(true);
  });
});

describe("GRUPOS_PADRAO — os cinco grupos que toda organização nova recebe", () => {
  it("são exatamente cinco, com nome único", () => {
    expect(GRUPOS_PADRAO).toHaveLength(5);
    expect(new Set(GRUPOS_PADRAO.map((g) => g.nome)).size).toBe(5);
  });

  it("Proprietário e Administrador têm todas as capacidades existentes", () => {
    const proprietario = GRUPOS_PADRAO.find((g) => g.nome === "Proprietário");
    const admin = GRUPOS_PADRAO.find((g) => g.nome === "Administrador");
    expect(temCapacidade(proprietario ? [proprietario] : [], "permission_groups:manage")).toBe(true);
    expect(temCapacidade(admin ? [admin] : [], "permission_groups:manage")).toBe(true);
  });

  it("Visualizador nunca tem capacidade de escrita", () => {
    const visualizador = GRUPOS_PADRAO.find((g) => g.nome === "Visualizador");
    expect(temCapacidade(visualizador ? [visualizador] : [], "contacts:write")).toBe(false);
  });
});
