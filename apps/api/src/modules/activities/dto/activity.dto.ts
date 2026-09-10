import { createZodDto } from "nestjs-zod";
import {
  ActivitySchema,
  CreateActivityInputSchema,
  CreateActivityResponseSchema,
  CompleteActivityInputSchema,
  CompleteActivityResponseSchema,
} from "@spark/core";

export class ActivityDto extends createZodDto(ActivitySchema) {}
export class CreateActivityDto extends createZodDto(CreateActivityInputSchema) {}
export class CreateActivityResponseDto extends createZodDto(CreateActivityResponseSchema) {}
export class CompleteActivityDto extends createZodDto(CompleteActivityInputSchema) {}
export class CompleteActivityResponseDto extends createZodDto(CompleteActivityResponseSchema) {}
