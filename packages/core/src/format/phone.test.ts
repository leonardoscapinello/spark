import { describe, expect, it } from "vitest";
import { phone, isValidPhone, formatPhone } from "./phone.js";

describe("phone", () => {
  it("normalizes mobile (9 digits) to E.164", () => {
    expect(phone("(11) 98888-7777")).toBe("+5511988887777");
  });

  it("normalizes landline (8 digits) to E.164", () => {
    expect(phone("(11) 3888-7777")).toBe("+551138887777");
  });

  it("accepts input already carrying +55", () => {
    expect(phone("+55 11 98888-7777")).toBe("+5511988887777");
  });

  it("rejects invalid area code", () => {
    expect(isValidPhone("(00) 98888-7777")).toBe(false);
  });

  it("rejects wrong length", () => {
    expect(isValidPhone("123")).toBe(false);
  });

  it("formats back with parens and dash", () => {
    expect(formatPhone(phone("11988887777"))).toBe("(11) 98888-7777");
  });
});
