/** Valores iniciais do tema da interface. O admin pode substituir estes
 * valores por organização sem alterar os tokens de componentes. */
export const DEFAULT_THEME_VALUES = {
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

export type ThemeFontFamily = "inter" | "system" | "rounded" | "serif";

