import { describe, expect, it } from "vitest";
import { contactMatches } from "./contactSearch.js";
import { email, phone } from "../format/index.js";

const jose = {
  name: "José da Silva",
  email: email("jose@empresa.com"),
  phone: phone("11987654321"),
};

describe("contactMatches — local contact search (docs/adr/0018)", () => {
  it("finds by name, ignoring accents and case", () => {
    expect(contactMatches(jose, "jose")).toBe(true);
    expect(contactMatches(jose, "JOSÉ")).toBe(true);
    expect(contactMatches(jose, "silva")).toBe(true);
  });

  it("finds by email", () => {
    expect(contactMatches(jose, "empresa.com")).toBe(true);
  });

  it("finds by phone", () => {
    expect(contactMatches(jose, "987654")).toBe(true);
  });

  it("does not find a term that matches no field", () => {
    expect(contactMatches(jose, "maria")).toBe(false);
  });

  it("empty or whitespace-only term matches everything — the no-filter state", () => {
    expect(contactMatches(jose, "")).toBe(true);
    expect(contactMatches(jose, "   ")).toBe(true);
  });

  it("does not break when email or phone are null", () => {
    const noContact = { name: "Ana", email: null, phone: null };
    expect(contactMatches(noContact, "ana")).toBe(true);
    expect(contactMatches(noContact, "nothing")).toBe(false);
  });
});
