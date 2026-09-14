import { createZodDto } from "nestjs-zod";
import { ArchiveSavedViewInputSchema, CreateSavedViewInputSchema, SavedViewWriteResponseSchema } from "@spark/core";

export class CreateSavedViewDto extends createZodDto(CreateSavedViewInputSchema) {}
export class ArchiveSavedViewDto extends createZodDto(ArchiveSavedViewInputSchema) {}
export class SavedViewWriteResponseDto extends createZodDto(SavedViewWriteResponseSchema) {}
