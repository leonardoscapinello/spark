import { createZodDto } from "nestjs-zod";
import { CreateDealProductInputSchema, DealProductWriteResponseSchema, UpdateDealProductInputSchema } from "@spark/core";

export class CreateDealProductDto extends createZodDto(CreateDealProductInputSchema) {}
export class UpdateDealProductDto extends createZodDto(UpdateDealProductInputSchema) {}
export class DealProductWriteResponseDto extends createZodDto(DealProductWriteResponseSchema) {}
