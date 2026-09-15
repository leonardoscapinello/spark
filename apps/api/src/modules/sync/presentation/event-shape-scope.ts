import { BadRequestException } from "@nestjs/common";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Escopo adicional da timeline. O filtro de organização continua obrigatório. */
export function appendEventShapeScope(
  query: Readonly<Record<string, string | undefined>>,
  filters: string[],
  params: string[],
): void {
  const scopes = [
    ["dealId", "deal_id"],
    ["contactId", "contact_id"],
    ["companyId", "company_id"],
  ] as const;
  const selected = scopes.filter(([key]) => query[key] !== undefined);
  if (selected.length !== 1) throw new BadRequestException("Exactly one event scope is required.");
  const [key, column] = selected[0] as (typeof scopes)[number];
  const value = query[key];
  if (!value || !UUID.test(value)) throw new BadRequestException(`Invalid ${key}.`);
  params.push(value);
  filters.push(`"${column}" = $${params.length}`);
}
