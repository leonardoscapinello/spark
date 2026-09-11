import { createZodDto } from "nestjs-zod";
import { AudienceWriteResponseSchema, CampaignWriteResponseSchema, CreateAudienceInputSchema, CreateCampaignInputSchema } from "@spark/core";
export class CreateAudienceDto extends createZodDto(CreateAudienceInputSchema) {}
export class CreateCampaignDto extends createZodDto(CreateCampaignInputSchema) {}
export class AudienceWriteResponseDto extends createZodDto(AudienceWriteResponseSchema) {}
export class CampaignWriteResponseDto extends createZodDto(CampaignWriteResponseSchema) {}
