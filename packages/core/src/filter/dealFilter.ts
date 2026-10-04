import { z } from "zod";
import type { Deal } from "../schema/deal.js";
import { normalizeMoney, toCents } from "../money/index.js";
import { FILTER_OPERATORS, filterOperatorNeedsValue, valueMatchesFilter } from "./contactFilter.js";

export const DEAL_FILTER_FIELDS = ["name", "status", "stageId", "ownerId", "contactId", "companyId", "amount", "probabilityBasisPoints", "expectedCloseDate", "createdAt", "tags"] as const;
export type DealFilterField = typeof DEAL_FILTER_FIELDS[number];
export const DealFilterSetSchema = z.object({
  combinator: z.enum(["and", "or"]),
  groups: z.array(z.object({ combinator: z.enum(["and", "or"]), conditions: z.array(z.object({
    field: z.enum(DEAL_FILTER_FIELDS), operator: z.enum(FILTER_OPERATORS),
    value: z.union([z.string().max(500), z.array(z.string().max(500)).max(100), z.null()]),
  })).max(30) })).max(10),
});
export type DealFilterSet = z.infer<typeof DealFilterSetSchema>;
export function decodeDealFilters(raw: string | null): DealFilterSet {
  if (!raw || raw.length > 20000) return { combinator: "and", groups: [] };
  try { const parsed = DealFilterSetSchema.safeParse(JSON.parse(raw)); return parsed.success ? parsed.data : { combinator: "and", groups: [] }; }
  catch { return { combinator: "and", groups: [] }; }
}
export function dealMatchesFilterSet(deal: Deal, filters: DealFilterSet): boolean {
  const groups = filters.groups.map(group => ({ ...group, conditions: group.conditions.filter(condition => !filterOperatorNeedsValue(condition.operator) || (Array.isArray(condition.value) ? condition.value.length>0 : condition.value !== null && condition.value !== "")) })).filter(group => group.conditions.length);
  const combine = (mode: "and" | "or", values: boolean[]) => mode === "and" ? values.every(Boolean) : values.some(Boolean);
  if (!groups.length) return true;
  return combine(filters.combinator, groups.map(group => combine(group.combinator, group.conditions.map(condition => {
    const value = condition.field === "amount" ? toCents(normalizeMoney(deal.amount))/100
      : condition.field === "probabilityBasisPoints" ? deal.probabilityBasisPoints == null ? null : deal.probabilityBasisPoints/100
      : condition.field === "createdAt" || condition.field === "expectedCloseDate" ? deal[condition.field]?.slice(0,10) ?? null
      : deal[condition.field];
    return valueMatchesFilter(value, condition);
  }))));
}
