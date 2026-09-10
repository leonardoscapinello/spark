import { createZodDto } from "nestjs-zod";
import { StageSchema, CreateStageInputSchema, CreateStageResponseSchema } from "@spark/core";

export class StageDto extends createZodDto(StageSchema) {}
export class CreateStageDto extends createZodDto(CreateStageInputSchema) {}
export class CreateStageResponseDto extends createZodDto(CreateStageResponseSchema) {}
