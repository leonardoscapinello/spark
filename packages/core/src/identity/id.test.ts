import { describe, expect, it } from "vitest";
import { orgId, contactId } from "./id.js";

describe("identificadores UUID v7", () => {
  it("gera um id novo válido", () => {
    const id = orgId.novo();
    expect(() => orgId.de(id)).not.toThrow();
  });

  it("rejeita string que não é UUID", () => {
    expect(() => orgId.de("não-é-um-uuid")).toThrow("precisa ser UUID v7");
  });

  it("rejeita UUID de outra versão (v4)", () => {
    // v4 clássico, não v7 — versão certa mas não a exigida
    expect(() => orgId.de("109156be-c4fb-41ea-b1b4-efe1671c5836")).toThrow();
  });

  it("dois tipos de id diferentes não são intercambiáveis em tipo", () => {
    const org = orgId.novo();
    const contact = contactId.novo();
    // valores são strings distintas; o que garante a separação é o tipo,
    // verificado pelo tsc — aqui só confirmamos que ids gerados são únicos.
    expect(org).not.toBe(contact);
  });
});
