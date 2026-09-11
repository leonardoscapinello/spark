import { createZodDto } from "nestjs-zod";
import { AutomationPublishResponseSchema, AutomationVersionSchema, AutomationWriteResponseSchema, CreateAutomationInputSchema, PublishAutomationInputSchema, UpdateAutomationDraftInputSchema, UpdateAutomationStatusInputSchema } from "@spark/core";

export class CreateAutomationDto extends createZodDto(CreateAutomationInputSchema) {}
export class UpdateAutomationDraftDto extends createZodDto(UpdateAutomationDraftInputSchema) {}
export class UpdateAutomationStatusDto extends createZodDto(UpdateAutomationStatusInputSchema) {}
export class PublishAutomationDto extends createZodDto(PublishAutomationInputSchema) {}
export class AutomationWriteResponseDto extends createZodDto(AutomationWriteResponseSchema) {}
export class AutomationPublishResponseDto extends createZodDto(AutomationPublishResponseSchema) {}
export class AutomationVersionDto extends createZodDto(AutomationVersionSchema) {}
