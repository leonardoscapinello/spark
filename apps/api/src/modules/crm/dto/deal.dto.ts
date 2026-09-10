import { createZodDto } from "nestjs-zod";
import {
  toCentavos,
  type Deal,
  DealSchema,
  CreateDealInputSchema,
  CreateDealResponseSchema,
  MoveDealInputSchema,
  MoveDealResponseSchema,
  CloseDealInputSchema,
  CloseDealResponseSchema,
} from "@spark/core";

export class DealDto extends createZodDto(DealSchema) {}
export class CreateDealDto extends createZodDto(CreateDealInputSchema) {}
export class CreateDealResponseDto extends createZodDto(CreateDealResponseSchema) {}
export class MoveDealDto extends createZodDto(MoveDealInputSchema) {}
export class MoveDealResponseDto extends createZodDto(MoveDealResponseSchema) {}
export class CloseDealDto extends createZodDto(CloseDealInputSchema) {}
export class CloseDealResponseDto extends createZodDto(CloseDealResponseSchema) {}

/**
 * `Deal.valor` é `Money` — tipo opaco de verdade, chave de Symbol
 * (packages/core/src/money/money.ts). `JSON.stringify` nunca serializa
 * chave de Symbol: devolver um Deal do jeito que ele é internamente faria
 * `valor` virar `{}` na resposta, silenciosamente. Todo controller que
 * devolve Deal passa por aqui primeiro — é o único lugar da API que
 * converte Money de volta pra número (o inverso do que zMoney já faz
 * sozinho na entrada, via transform do Zod).
 */
export function paraDealDto(deal: Deal): DealDto {
  return { ...deal, valor: toCentavos(deal.valor) } as unknown as DealDto;
}
