import { createZodDto } from "nestjs-zod";
import { PipelineSchema, CreatePipelineInputSchema, CreatePipelineResponseSchema } from "@spark/core";

/** No field hand-written — all three are born from core's Zod schema (ADR-0004, ADR-0019). */
export class PipelineDto extends createZodDto(PipelineSchema) {}
export class CreatePipelineDto extends createZodDto(CreatePipelineInputSchema) {}
export class CreatePipelineResponseDto extends createZodDto(CreatePipelineResponseSchema) {}
