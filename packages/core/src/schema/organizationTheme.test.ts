import { describe, expect, it } from "vitest";
import { ThemeFontFamilySchema } from "./organizationTheme.js";

describe("fontes de organização", () => {
  it("aceita Brockmann e Geist sem invalidar famílias já persistidas", () => {
    for (const family of ["brockmann", "geist", "inter", "system", "rounded", "serif"]) {
      expect(ThemeFontFamilySchema.parse(family)).toBe(family);
    }
  });

  it("recusa CSS arbitrário no lugar da família", () => {
    expect(ThemeFontFamilySchema.safeParse("url(https://example.com/font)").success).toBe(false);
  });
});
