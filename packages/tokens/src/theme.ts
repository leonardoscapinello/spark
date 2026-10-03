/** Valores iniciais do tema da interface. O admin pode substituir estes
 * valores por organização sem alterar os tokens de componentes. */
const LEGACY_THEME_VALUES = {
  accentColor: "#1B45E8",
  accentStrongColor: "#1539C5",
  groundColor: "#EFF0EB",
  surfaceColor: "#FFFFFF",
  surface2Color: "#FBFBF9",
  inkColor: "#1A1A1A",
  inkMutedColor: "#646462",
  lineColor: "#E9EAE6",
  statusSuccessColor: "#2F9270",
  statusWarningColor: "#B87518",
  statusDangerColor: "#C94B5A",
  fontBody: "inter",
  fontDisplay: "inter",
} as const;

export const DEFAULT_THEME_VALUES = {
  accentColor: "#1D1B18",
  accentStrongColor: "#34312C",
  groundColor: "#F6F4EF",
  surfaceColor: "#FFFEFB",
  surface2Color: "#F1EEE7",
  inkColor: "#1D1B18",
  inkMutedColor: "#67625A",
  lineColor: "#E7E3DA",
  statusSuccessColor: "#347653",
  statusWarningColor: "#8B5B23",
  statusDangerColor: "#CF3F28",
  fontBody: "geist",
  fontDisplay: "geist",
} as const;

export type ThemeFontFamily = "brockmann" | "geist" | "inter" | "system" | "rounded" | "serif";

type ThemeValues = { [Key in keyof typeof DEFAULT_THEME_VALUES]: string };

/** O cache anterior pode não conter surface2Color. Customizações permanecem. */
export function isDefaultTheme(theme: Omit<ThemeValues, "surface2Color"> & Partial<Pick<ThemeValues, "surface2Color">>): boolean {
  return [DEFAULT_THEME_VALUES, { ...DEFAULT_THEME_VALUES, fontBody: "brockmann", fontDisplay: "brockmann" }, LEGACY_THEME_VALUES].some(preset =>
    Object.entries(preset).every(([key, value]) => {
      const actual = theme[key as keyof ThemeValues];
      return (key === "surface2Color" && actual == null) || actual?.toLowerCase() === value.toLowerCase();
    }),
  );
}
