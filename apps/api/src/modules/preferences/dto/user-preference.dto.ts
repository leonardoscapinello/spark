import { createZodDto } from "nestjs-zod";
import { UpsertUserPreferenceInputSchema, UserPreferenceWriteResponseSchema } from "@spark/core";

export class UpsertUserPreferenceDto extends createZodDto(UpsertUserPreferenceInputSchema) {}
export class UserPreferenceWriteResponseDto extends createZodDto(UserPreferenceWriteResponseSchema) {}
