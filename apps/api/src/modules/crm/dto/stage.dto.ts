import { createZodDto } from "nestjs-zod";
import {
  StageSchema,
  CreateStageInputSchema,
  CreateStageResponseSchema,
  RenameStageInputSchema,
  RenameStageResponseSchema,
  ConfigureStageInputSchema,
  ConfigureStageResponseSchema,
  ArchiveStageInputSchema,
  ArchiveStageResponseSchema,
  ReorderStagesInputSchema,
  ReorderStagesResponseSchema,
} from "@spark/core";

export class StageDto extends createZodDto(StageSchema) {}
export class CreateStageDto extends createZodDto(CreateStageInputSchema) {}
export class CreateStageResponseDto extends createZodDto(CreateStageResponseSchema) {}
export class RenameStageDto extends createZodDto(RenameStageInputSchema) {}
export class RenameStageResponseDto extends createZodDto(RenameStageResponseSchema) {}
export class ConfigureStageDto extends createZodDto(ConfigureStageInputSchema) {}
export class ConfigureStageResponseDto extends createZodDto(ConfigureStageResponseSchema) {}
export class ArchiveStageDto extends createZodDto(ArchiveStageInputSchema) {}
export class ArchiveStageResponseDto extends createZodDto(ArchiveStageResponseSchema) {}
export class ReorderStagesDto extends createZodDto(ReorderStagesInputSchema) {}
export class ReorderStagesResponseDto extends createZodDto(ReorderStagesResponseSchema) {}
