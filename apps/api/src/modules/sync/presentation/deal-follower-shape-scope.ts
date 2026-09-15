import { BadRequestException } from "@nestjs/common";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Seguidores só são sincronizados para o negócio aberto, nunca para a organização inteira. */
export function appendDealFollowerShapeScope(
  query: Readonly<Record<string, string | undefined>>,
  filters: string[],
  params: string[],
): void {
  const dealId = query.dealId;
  if (!dealId || !UUID.test(dealId)) throw new BadRequestException("Invalid dealId.");
  params.push(dealId);
  filters.push(`"deal_id" = $${params.length}`);
}
