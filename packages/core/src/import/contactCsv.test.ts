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

describe("parseContactCsv — exportação do Pipedrive", () => {
  it("reads the Portuguese person export, taking the first filled e-mail and phone", () => {
    const csv = [
      "Nome,Email - Trabalho,Email - Casa,Telefone - Trabalho,Telefone - Celular,Organização,Etiquetas,Origem da fonte",
      "Ana Souza,,ana@casa.com,,+55 11 91234-5678,Acme,Cliente|VIP,Indicação",
    ].join("\n");
    const result = parseContactCsv(csv);
    expect(result.errors).toEqual([]);
    expect(result.rows).toHaveLength(1);
    const [row] = result.rows;
    expect(row?.name).toBe("Ana Souza");
    expect(row?.email).toBe("ana@casa.com");
    expect(row?.phone).toBe("+5511912345678");
    expect(row?.tags).toEqual(["Cliente", "VIP"]);
    expect(row?.source).toBe("Indicação");
    expect(row?.errors).toEqual([]);
  });

  it("reads the English person export and composes the name from first and last name", () => {
    const csv = [
      "First name,Last name,Email - Work,Phone - Mobile,Labels",
      "John,Doe,john@work.com,+55 21 99876-5432,Lead",
      ",Solo,solo@work.com,,",
    ].join("\n");
    const result = parseContactCsv(csv);
    expect(result.errors).toEqual([]);
    expect(result.rows.map((row) => row.name)).toEqual(["John Doe", "Solo"]);
    expect(result.rows[0]?.email).toBe("john@work.com");
    expect(result.rows[0]?.tags).toEqual(["Lead"]);
  });

  it("still requires a name column when neither a name nor first/last name exists", () => {
    expect(parseContactCsv("Email - Work\na@b.com").errors).toEqual(["Inclua uma coluna Nome no arquivo."]);
  });
});
