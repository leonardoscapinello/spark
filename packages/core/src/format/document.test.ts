import { describe, expect, it } from "vitest";
import { cpf, cnpj, isValidCpf, isValidCnpj, formatCpf, formatCnpj, documento } from "./document.js";

describe("CPF", () => {
  // CPFs válidos gerados por algoritmo — não pertencem a pessoa real.
  it("aceita CPF com dígito verificador correto", () => {
    expect(isValidCpf("111.444.777-35")).toBe(true);
    expect(() => cpf("111.444.777-35")).not.toThrow();
  });

  it("rejeita dígito verificador errado", () => {
    expect(isValidCpf("111.444.777-36")).toBe(false);
  });

  it("rejeita sequência de dígitos repetidos", () => {
    expect(isValidCpf("111.111.111-11")).toBe(false);
    expect(isValidCpf("000.000.000-00")).toBe(false);
  });

  it("rejeita tamanho errado", () => {
    expect(isValidCpf("123")).toBe(false);
  });

  it("formata de volta com pontuação", () => {
    expect(formatCpf(cpf("11144477735"))).toBe("111.444.777-35");
  });
});

describe("CNPJ", () => {
  it("aceita CNPJ com dígito verificador correto", () => {
    expect(isValidCnpj("11.222.333/0001-81")).toBe(true);
  });

  it("rejeita dígito verificador errado", () => {
    expect(isValidCnpj("11.222.333/0001-82")).toBe(false);
  });

  it("rejeita sequência de dígitos repetidos", () => {
    expect(isValidCnpj("11.111.111/1111-11")).toBe(false);
  });

  it("formata de volta com pontuação", () => {
    expect(formatCnpj(cnpj("11222333000181"))).toBe("11.222.333/0001-81");
  });
});

describe("documento (CPF ou CNPJ)", () => {
  it("detecta CPF por tamanho", () => {
    expect(documento("111.444.777-35")).toEqual({ tipo: "cpf", valor: "11144477735" });
  });

  it("detecta CNPJ por tamanho", () => {
    expect(documento("11.222.333/0001-81")).toEqual({ tipo: "cnpj", valor: "11222333000181" });
  });

  it("rejeita tamanho que não é nem CPF nem CNPJ", () => {
    expect(() => documento("123456")).toThrow();
  });
});
