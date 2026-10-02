import { z } from "zod";
import { zOrgId, zServerTimestamp } from "./zodHelpers.js";

/**
 * Identidade visual por organização. Cores são hex de seis dígitos para que
 * o valor salvo nunca possa virar CSS arbitrário; famílias tipográficas são
 * referências a um catálogo seguro aplicado pelo cliente.
 */
export const ThemeHexColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use uma cor hexadecimal de seis dígitos.");
export const ThemeFontFamilySchema = z.enum(["brockmann", "geist", "inter", "system", "rounded", "serif"]);

const ThemeValuesSchema = z.object({
  accentColor: ThemeHexColorSchema,
  accentStrongColor: ThemeHexColorSchema,
  groundColor: ThemeHexColorSchema,
  surfaceColor: ThemeHexColorSchema,
  surface2Color: ThemeHexColorSchema,
  inkColor: ThemeHexColorSchema,
  inkMutedColor: ThemeHexColorSchema,
  lineColor: ThemeHexColorSchema,
  statusSuccessColor: ThemeHexColorSchema,
  statusWarningColor: ThemeHexColorSchema,
  statusDangerColor: ThemeHexColorSchema,
  fontBody: ThemeFontFamilySchema,
  fontDisplay: ThemeFontFamilySchema,
});

export const OrganizationThemeSchema = ThemeValuesSchema.extend({
  orgId: zOrgId,
  createdAt: zServerTimestamp,
  updatedAt: zServerTimestamp,
});
export type OrganizationTheme = z.infer<typeof OrganizationThemeSchema>;

export const UpdateOrganizationThemeInputSchema = ThemeValuesSchema;
export type UpdateOrganizationThemeInput = z.infer<typeof UpdateOrganizationThemeInputSchema>;

export const OrganizationThemeWriteResponseSchema = z.object({
  theme: OrganizationThemeSchema,
  txid: z.number().int(),
});
export type OrganizationThemeWriteResponse = z.infer<typeof OrganizationThemeWriteResponseSchema>;
