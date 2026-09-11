import { describe, expect, it } from "vitest";
import { email, isValidEmail } from "./email.js";

describe("email", () => {
  it("normalizes to lowercase and trims whitespace", () => {
    expect(email("  Contact@Company.com.br  ")).toBe("contact@company.com.br");
  });

  it("accepts common formats", () => {
    expect(isValidEmail("first.last+tag@domain.co")).toBe(true);
  });

  it("rejects missing @ or missing domain", () => {
    expect(isValidEmail("no-at-sign")).toBe(false);
    expect(isValidEmail("no@domain")).toBe(false);
  });
});
