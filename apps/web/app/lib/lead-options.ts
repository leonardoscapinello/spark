import type { LeadStatus } from "@spark/core";

export const LEAD_STATUS_OPTIONS: ReadonlyArray<{ value: LeadStatus; label: string }> = [
  { value: "new", label: "Novo" },
  { value: "qualified", label: "Qualificado" },
  { value: "nurturing", label: "Em nutrição" },
  { value: "customer", label: "Cliente" },
  { value: "unqualified", label: "Desqualificado" },
];

export const LEAD_SOURCE_OPTIONS = [
  { value: "instagram", label: "Instagram" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "website", label: "Site" },
  { value: "referral", label: "Indicação" },
  { value: "manual", label: "Cadastro manual" },
  { value: "other", label: "Outra origem" },
] as const;

export function leadStatusLabel(status: LeadStatus): string {
  return LEAD_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;
}
