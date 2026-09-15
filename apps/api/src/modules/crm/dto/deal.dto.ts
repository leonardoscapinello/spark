import { createZodDto } from "nestjs-zod";
import {
  toCents,
  type Deal,
  DealSchema,
  CreateDealInputSchema,
  CreateDealResponseSchema,
  MoveDealInputSchema,
  MoveDealResponseSchema,
  EditDealInputSchema,
  EditDealResponseSchema,
  CloseDealInputSchema,
  CloseDealResponseSchema,
  ReopenDealResponseSchema,
} from "@spark/core";

export class DealDto extends createZodDto(DealSchema) {}
export class CreateDealDto extends createZodDto(CreateDealInputSchema) {}
export class CreateDealResponseDto extends createZodDto(CreateDealResponseSchema) {}
export class MoveDealDto extends createZodDto(MoveDealInputSchema) {}
export class MoveDealResponseDto extends createZodDto(MoveDealResponseSchema) {}
export class EditDealDto extends createZodDto(EditDealInputSchema) {}
export class EditDealResponseDto extends createZodDto(EditDealResponseSchema) {}
export class CloseDealDto extends createZodDto(CloseDealInputSchema) {}
export class CloseDealResponseDto extends createZodDto(CloseDealResponseSchema) {}
export class ReopenDealResponseDto extends createZodDto(ReopenDealResponseSchema) {}

/**
 * `Deal.amount` is `Money` — a genuinely opaque type, Symbol-keyed
 * (packages/core/src/money/money.ts). `JSON.stringify` never serializes a
 * Symbol key: returning a Deal as-is internally would silently turn
 * `amount` into `{}` in the response. Every controller that returns a
 * Deal goes through here first — the only place in the API that converts
 * Money back to a number (the inverse of what zMoney already does on its
 * own on input, via Zod's transform).
 */
export function toDealDto(deal: Deal): DealDto {
  return { ...deal, amount: toCents(deal.amount) } as unknown as DealDto;
}
