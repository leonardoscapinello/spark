import { describe, expect, it } from "vitest";
import { email, isValidEmail } from "./email.js";

describe("email", () => {
  it("normaliza para minúsculo e remove espaço nas pontas", () => {
    expect(email("  Contato@Empresa.com.br  ")).toBe("contato@empresa.com.br");
  });

  it("aceita formatos comuns", () => {
    expect(isValidEmail("nome.sobrenome+tag@dominio.co")).toBe(true);
  });

  it("rejeita sem @ ou sem domínio", () => {
    expect(isValidEmail("sem-arroba")).toBe(false);
    expect(isValidEmail("sem@dominio")).toBe(false);
  });
});
