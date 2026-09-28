import { describe, it, expect } from "vitest";
import { ContactSchema } from "../schema/contact.js";
import { contactMergePatch } from "./contactMerge.js";
const person = (id: string, email: string | null = null) => ContactSchema.parse({ id, orgId: "00000000-0000-7000-8000-000000000001", name: "Pessoa", email, phone: null, createdAt: "2026-09-01T00:00:00Z", updatedAt: "2026-09-01T00:00:00Z", deletedAt: null });
describe("mesclar pessoas", () => {
  it("preserva o destino e só completa campos vazios", () => {
    const target = person("00000000-0000-7000-8000-000000000002", "principal@example.com");
    const source = person("00000000-0000-7000-8000-000000000003", "alternativo@example.com");
    expect(contactMergePatch(target, source).email).toBe(target.email);
    expect(contactMergePatch({ ...target, email: null }, source).email).toBe(source.email);
  });
  it("recusa mesma pessoa, pessoa arquivada e outra organização", () => {
    const target = person("00000000-0000-7000-8000-000000000002");
    const source = person("00000000-0000-7000-8000-000000000003");
    expect(() => contactMergePatch(target, target)).toThrow();
    expect(() => contactMergePatch(target, { ...source, deletedAt: source.createdAt })).toThrow();
    expect(() => contactMergePatch(target, { ...source, orgId: ContactSchema.shape.orgId.parse("00000000-0000-7000-8000-000000000004") })).toThrow();
  });
});
