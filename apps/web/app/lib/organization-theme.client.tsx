import { useEffect, type ReactNode } from "react";
import { eq, useLiveQuery } from "@tanstack/react-db";
import type { OrganizationTheme, UpdateOrganizationThemeInput } from "@spark/core";
import { DEFAULT_THEME_VALUES } from "@spark/tokens";
import { getOrganizationThemesCollection } from "./organization-themes-collection.client";

export type ThemeDraft = UpdateOrganizationThemeInput;

export const DEFAULT_THEME: ThemeDraft = { ...DEFAULT_THEME_VALUES };

export const FONT_FAMILY_OPTIONS = [
  { value: "inter", label: "Inter", description: "Neutra e compacta" },
  { value: "system", label: "Sistema", description: "A fonte nativa de cada dispositivo" },
  { value: "rounded", label: "Arredondada", description: "Mais amigável em interfaces de atendimento" },
  { value: "serif", label: "Serif", description: "Mais editorial para a identidade da marca" },
] as const;

const FONT_STACKS: Record<ThemeDraft["fontBody"], string> = {
  inter: "Inter, system-ui, sans-serif",
  system: "ui-sans-serif, system-ui, sans-serif",
  rounded: "ui-rounded, \"SF Pro Rounded\", system-ui, sans-serif",
  serif: "ui-serif, Georgia, serif",
};

export function fontStackFor(font: ThemeDraft["fontBody"]): string {
  return FONT_STACKS[font];
}

const COLOR_VARIABLES = {
  accentColor: "--color-accent",
  accentStrongColor: "--color-accentStrong",
  groundColor: "--color-ground",
  surfaceColor: "--color-surface",
  surface2Color: "--color-surface2",
  inkColor: "--color-ink",
  inkMutedColor: "--color-inkMuted",
  lineColor: "--color-line",
  statusSuccessColor: "--color-statusSuccess",
  statusWarningColor: "--color-statusWarning",
  statusDangerColor: "--color-statusDanger",
} as const;
const DERIVED_VARIABLES = ["--color-accentWash", "--color-focusRing", "--color-statusSuccessSoft", "--color-statusWarningSoft", "--color-statusDangerSoft"] as const;

const THEME_CACHE_PREFIX = "spark:organization-theme:";

function cacheKey(orgId: string) { return `${THEME_CACHE_PREFIX}${orgId}`; }

export function cacheOrganizationTheme(theme: OrganizationTheme): void {
  try { localStorage.setItem(cacheKey(theme.orgId), JSON.stringify(theme)); } catch { /* storage indisponível não pode bloquear o app */ }
}

function readCachedTheme(orgId: string): OrganizationTheme | null {
  try {
    const value = localStorage.getItem(cacheKey(orgId));
    return value ? JSON.parse(value) as OrganizationTheme : null;
  } catch { return null; }
}

export function applyOrganizationTheme(theme: OrganizationTheme | ThemeDraft | null): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  for (const variable of Object.values(COLOR_VARIABLES)) root.style.removeProperty(variable);
  for (const variable of DERIVED_VARIABLES) root.style.removeProperty(variable);
  root.style.removeProperty("--typography-fontFamily-body");
  root.style.removeProperty("--typography-fontFamily-display");
  if (!theme) return;
  for (const [key, variable] of Object.entries(COLOR_VARIABLES)) {
    const value = theme[key as keyof typeof COLOR_VARIABLES] as string;
    root.style.setProperty(variable, value);
  }
  root.style.setProperty("--color-accentWash", `color-mix(in srgb, ${theme.accentColor} 12%, transparent)`);
  root.style.setProperty("--color-focusRing", theme.accentColor);
  root.style.setProperty("--color-statusSuccessSoft", `color-mix(in srgb, ${theme.statusSuccessColor} 12%, transparent)`);
  root.style.setProperty("--color-statusWarningSoft", `color-mix(in srgb, ${theme.statusWarningColor} 12%, transparent)`);
  root.style.setProperty("--color-statusDangerSoft", `color-mix(in srgb, ${theme.statusDangerColor} 12%, transparent)`);
  root.style.setProperty("--typography-fontFamily-body", FONT_STACKS[theme.fontBody]);
  root.style.setProperty("--typography-fontFamily-display", FONT_STACKS[theme.fontDisplay]);
}

/** Aplica a identidade assim que o registro chega do cache local ou do shape. */
export function OrganizationThemeProvider({ orgId, children }: { orgId: string; children?: ReactNode }) {
  const themes = getOrganizationThemesCollection();
  const { data: rows = [] } = useLiveQuery({ query: (q) => q.from({ themes }).where(({ themes: theme }) => eq(theme.orgId, orgId)) }, [orgId, themes]);
  const theme = rows[0] ?? readCachedTheme(orgId);

  useEffect(() => {
    applyOrganizationTheme(theme ?? null);
    return () => applyOrganizationTheme(null);
  }, [theme]);

  return children ?? null;
}
