import { describe, expect, it } from "vitest";
import { DEFAULT_THEME_VALUES, isDefaultTheme } from "./theme.js";

describe("presets e aparência personalizada", () => {
  it("deixa o preset seguir a cascata clara/escura dos tokens", () => {
    expect(isDefaultTheme(DEFAULT_THEME_VALUES)).toBe(true);
    expect(isDefaultTheme({ ...DEFAULT_THEME_VALUES, fontBody: "geist", fontDisplay: "geist" })).toBe(true);
    expect(isDefaultTheme({ ...DEFAULT_THEME_VALUES, accentColor: "#1d1b18" })).toBe(true);
  });

  it("preserva uma personalização mesmo quando só uma cor ou fonte mudou", () => {
    expect(isDefaultTheme({ ...DEFAULT_THEME_VALUES, accentColor: "#123456" })).toBe(false);
    expect(isDefaultTheme({ ...DEFAULT_THEME_VALUES, fontBody: "inter" })).toBe(false);
  });

  it("reconhece o preset persistido pela migration 0070 sem regravar a organização", () => {
    const legacy = {
      accentColor: "#1B45E8", accentStrongColor: "#1539C5", groundColor: "#EFF0EB",
      surfaceColor: "#FFFFFF", surface2Color: "#FBFBF9", inkColor: "#1A1A1A",
      inkMutedColor: "#646462", lineColor: "#E9EAE6", statusSuccessColor: "#2F9270",
      statusWarningColor: "#B87518", statusDangerColor: "#C94B5A", fontBody: "inter", fontDisplay: "inter",
    };
    expect(isDefaultTheme(legacy)).toBe(true);
    const { surface2Color: _surface2, ...cachedLegacy } = legacy;
    expect(isDefaultTheme(cachedLegacy)).toBe(true);
    expect(isDefaultTheme({ ...cachedLegacy, accentColor: "#123456" })).toBe(false);
    expect(isDefaultTheme({ ...legacy, groundColor: "#EEEEEE" })).toBe(false);
  });
});
