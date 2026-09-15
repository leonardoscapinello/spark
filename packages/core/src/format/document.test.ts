import { describe, expect, it } from "vitest";
import { cpf, cnpj, isValidCpf, isValidCnpj, formatCpf, formatCnpj, formatTaxDocument, maskTaxDocumentInput, taxDocument } from "./document.js";

describe("CPF", () => {
  // Valid CPFs generated algorithmically — not real people's.
  it("accepts a CPF with a correct check digit", () => {
    expect(isValidCpf("111.444.777-35")).toBe(true);
    expect(() => cpf("111.444.777-35")).not.toThrow();
  });

  it("rejects a wrong check digit", () => {
    expect(isValidCpf("111.444.777-36")).toBe(false);
  });

  it("rejects a run of repeated digits", () => {
    expect(isValidCpf("111.111.111-11")).toBe(false);
    expect(isValidCpf("000.000.000-00")).toBe(false);
  });

  it("rejects wrong length", () => {
    expect(isValidCpf("123")).toBe(false);
  });

  it("formats back with punctuation", () => {
    expect(formatCpf(cpf("11144477735"))).toBe("111.444.777-35");
  });
});

describe("CNPJ", () => {
  it("accepts a CNPJ with a correct check digit", () => {
    expect(isValidCnpj("11.222.333/0001-81")).toBe(true);
  });

  it("rejects a wrong check digit", () => {
    expect(isValidCnpj("11.222.333/0001-82")).toBe(false);
  });

  it("rejects a run of repeated digits", () => {
    expect(isValidCnpj("11.111.111/1111-11")).toBe(false);
  });

  it("formats back with punctuation", () => {
    expect(formatCnpj(cnpj("11222333000181"))).toBe("11.222.333/0001-81");
  });
});

describe("taxDocument (CPF or CNPJ)", () => {
  it("detects CPF by length", () => {
    expect(taxDocument("111.444.777-35")).toEqual({ type: "cpf", value: "11144477735" });
  });

  it("detects CNPJ by length", () => {
    expect(taxDocument("11.222.333/0001-81")).toEqual({ type: "cnpj", value: "11222333000181" });
  });

  it("rejects a length that is neither CPF nor CNPJ", () => {
    expect(() => taxDocument("123456")).toThrow();
  });
});

/** Exibir não é validar: um documento fora de padrão aparece, não derruba a tela. */
describe("formatTaxDocument", () => {
  it("põe a máscara pelo tamanho e devolve o resto como veio", () => {
    expect(formatTaxDocument("12345678909")).toBe("123.456.789-09");
    expect(formatTaxDocument("11222333000181")).toBe("11.222.333/0001-81");
    expect(formatTaxDocument("12345")).toBe("12345");
  });
});

/**
 * A máscara de digitação acompanha o número em vez de esperar ele ficar
 * completo. Uma máscara de tamanho fixo em CPF recusava o 12º dígito, e um
 * CNPJ nunca chegava a ser digitado no campo.
 */
describe("maskTaxDocumentInput", () => {
  it("desenha CPF até 11 dígitos", () => {
    expect(maskTaxDocumentInput("123")).toBe("123");
    expect(maskTaxDocumentInput("1234567")).toBe("123.456.7");
    expect(maskTaxDocumentInput("12345678909")).toBe("123.456.789-09");
  });

  it("vira CNPJ a partir do 12º dígito", () => {
    expect(maskTaxDocumentInput("112223330001")).toBe("11.222.333/0001");
    expect(maskTaxDocumentInput("11222333000181")).toBe("11.222.333/0001-81");
  });

  it("descarta o que passa de 14 dígitos e ignora o que não é número", () => {
    expect(maskTaxDocumentInput("11.222.333/0001-81999")).toBe("11.222.333/0001-81");
  });
});
