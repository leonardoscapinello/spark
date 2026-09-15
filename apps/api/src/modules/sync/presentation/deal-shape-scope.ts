import { BadRequestException } from "@nestjs/common";

/** Additional narrowing only: never replace the authenticated org filter. */
export function appendDealShapeScope(
  query: Readonly<Record<string, string | undefined>>,
  filters: string[],
  params: string[],
): void {
  filters.push('"deleted_at" IS NULL');
  for (const [key, column] of [["dealId", "id"], ["pipelineId", "pipeline_id"]] as const) {
    const value = query[key];
    if (value === undefined) continue;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
      throw new BadRequestException(`Invalid ${key}.`);
    }
    params.push(value);
    filters.push(`"${column}" = $${params.length}`);
  }
  const status = query.status;
  if (status !== undefined) {
    if (!["open", "won", "lost"].includes(status)) throw new BadRequestException("Invalid deal status.");
    params.push(status);
    filters.push(`"status" = $${params.length}`);
  }
}
