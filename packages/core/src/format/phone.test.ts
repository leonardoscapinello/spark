import { describe, expect, it } from "vitest";
import { telefone, isValidTelefone, formatTelefone } from "./phone.js";

describe("telefone", () => {
  it("normaliza celular (9 dígitos) para E.164", () => {
    expect(telefone("(11) 98888-7777")).toBe("+5511988887777");
  });

  it("normaliza fixo (8 dígitos) para E.164", () => {
    expect(telefone("(11) 3888-7777")).toBe("+551138887777");
  });

  it("aceita já vindo com +55", () => {
    expect(telefone("+55 11 98888-7777")).toBe("+5511988887777");
  });

  it("rejeita DDD inválido", () => {
    expect(isValidTelefone("(00) 98888-7777")).toBe(false);
  });

  it("rejeita tamanho errado", () => {
    expect(isValidTelefone("123")).toBe(false);
  });

  it("formata de volta com parênteses e traço", () => {
    expect(formatTelefone(telefone("11988887777"))).toBe("(11) 98888-7777");
  });
});
