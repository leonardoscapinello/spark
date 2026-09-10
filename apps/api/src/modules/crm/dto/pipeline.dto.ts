import { createZodDto } from "nestjs-zod";
import { PipelineSchema, CreatePipelineInputSchema, CreatePipelineResponseSchema } from "@spark/core";

/** Nenhum campo escrito à mão — os três nascem do schema Zod de core (ADR-0004, ADR-0019). */
export class PipelineDto extends createZodDto(PipelineSchema) {}
export class CreatePipelineDto extends createZodDto(CreatePipelineInputSchema) {}
export class CreatePipelineResponseDto extends createZodDto(CreatePipelineResponseSchema) {}
