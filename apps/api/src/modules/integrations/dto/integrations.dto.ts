import { createZodDto } from "nestjs-zod";
import { IntegrationWriteResponseSchema, UpdateIntegrationStatusInputSchema, UpsertIntegrationInputSchema } from "@spark/core";
export class UpsertIntegrationDto extends createZodDto(UpsertIntegrationInputSchema) {}
export class UpdateIntegrationStatusDto extends createZodDto(UpdateIntegrationStatusInputSchema) {}
export class IntegrationWriteResponseDto extends createZodDto(IntegrationWriteResponseSchema) {}
