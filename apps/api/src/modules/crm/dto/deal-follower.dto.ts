import { createZodDto } from "nestjs-zod";
import { AddDealFollowerInputSchema, DealFollowerWriteResponseSchema } from "@spark/core";

export class AddDealFollowerDto extends createZodDto(AddDealFollowerInputSchema) {}
export class DealFollowerWriteResponseDto extends createZodDto(DealFollowerWriteResponseSchema) {}
