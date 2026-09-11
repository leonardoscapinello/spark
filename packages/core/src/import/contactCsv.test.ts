import { describe, expect, it } from "vitest";
import { parseContactCsv } from "./contactCsv.js";

describe("parseContactCsv", () => {
  it("recognizes Portuguese headers, semicolon separator and quoted values", () => {
    const result = parseContactCsv('Nome;E-mail;Telefone;Tags\n"Maria, Silva";MARIA@EXAMPLE.COM;(11) 99999-9999;vip|evento');
    expect(result.errors).toEqual([]);
    expect(result.rows[0]).toMatchObject({ name: "Maria, Silva", email: "maria@example.com", phone: "+5511999999999", tags: ["vip", "evento"], errors: [] });
  });

  it("marks invalid and repeated identifiers before import", () => {
    const result = parseContactCsv("nome,email\nPrimeiro,pessoa@example.com\nSegundo,pessoa@example.com\nTerceiro,invalido");
    expect(result.rows[1]?.errors).toContain("E-mail repetido no arquivo");
    expect(result.rows[2]?.errors).toContain("E-mail inválido");
  });
});
