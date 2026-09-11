import { describe, expect, it } from "vitest";
import { contatoCorresponde } from "./contactSearch.js";
import { email, telefone } from "../format/index.js";

const jose = {
  nome: "José da Silva",
  email: email("jose@empresa.com"),
  telefone: telefone("11987654321"),
};

describe("contatoCorresponde — busca local de contato (docs/adr/0018)", () => {
  it("acha por nome, ignorando acento e maiúsculas", () => {
    expect(contatoCorresponde(jose, "jose")).toBe(true);
    expect(contatoCorresponde(jose, "JOSÉ")).toBe(true);
    expect(contatoCorresponde(jose, "silva")).toBe(true);
  });

  it("acha por e-mail", () => {
    expect(contatoCorresponde(jose, "empresa.com")).toBe(true);
  });

  it("acha por telefone", () => {
    expect(contatoCorresponde(jose, "987654")).toBe(true);
  });

  it("não acha termo que não bate em nenhum campo", () => {
    expect(contatoCorresponde(jose, "maria")).toBe(false);
  });

  it("termo vazio ou só espaço acha tudo — é o estado sem filtro", () => {
    expect(contatoCorresponde(jose, "")).toBe(true);
    expect(contatoCorresponde(jose, "   ")).toBe(true);
  });

  it("não quebra quando email ou telefone são nulos", () => {
    const semContato = { nome: "Ana", email: null, telefone: null };
    expect(contatoCorresponde(semContato, "ana")).toBe(true);
    expect(contatoCorresponde(semContato, "nada")).toBe(false);
  });
});
