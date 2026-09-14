import { describe, it, expect } from "vitest";
import { buildContactSearchQuery } from "./contactSearchQuery.js";

describe("buildContactSearchQuery", () => {
  it("vira prefixos ligados por AND, sem acento e em minúsculas", () => {
    expect(buildContactSearchQuery("José Con")).toBe("jose:* & con:*");
  });

  it("descarta sintaxe de tsquery digitada pelo usuário", () => {
    expect(buildContactSearchQuery("ana & (maria) | !x:*")).toBe("ana:* & maria:* & x:*");
  });

  it("devolve null sem termo, em vez de uma query vazia", () => {
    expect(buildContactSearchQuery("   ")).toBeNull();
    expect(buildContactSearchQuery("&&& ***")).toBeNull();
  });

  it("limita a quantidade de termos", () => {
    const many = Array.from({ length: 20 }, (_, index) => `t${index}`).join(" ");
    expect(buildContactSearchQuery(many)?.split(" & ")).toHaveLength(8);
  });

  it("mantém número e telefone como termo", () => {
    expect(buildContactSearchQuery("11999")).toBe("11999:*");
  });
});
