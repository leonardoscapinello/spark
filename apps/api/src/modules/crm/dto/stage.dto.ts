import { createZodDto } from "nestjs-zod";
import {
  StageSchema,
  CreateStageInputSchema,
  CreateStageResponseSchema,
  RenameStageInputSchema,
  RenameStageResponseSchema,
} from "@spark/core";

export class StageDto extends createZodDto(StageSchema) {}
export class CreateStageDto extends createZodDto(CreateStageInputSchema) {}
export class CreateStageResponseDto extends createZodDto(CreateStageResponseSchema) {}
export class RenameStageDto extends createZodDto(RenameStageInputSchema) {}
export class RenameStageResponseDto extends createZodDto(RenameStageResponseSchema) {}
