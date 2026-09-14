import { createZodDto } from "nestjs-zod";
import { CreateStageFieldRuleInputSchema, StageFieldRuleWriteResponseSchema } from "@spark/core";

export class CreateStageFieldRuleDto extends createZodDto(CreateStageFieldRuleInputSchema) {}
export class StageFieldRuleWriteResponseDto extends createZodDto(StageFieldRuleWriteResponseSchema) {}
