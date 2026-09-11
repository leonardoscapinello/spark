import { createZodDto } from "nestjs-zod";
import {
  CreateSocialPostInputSchema,
  SocialPostWriteResponseSchema,
  SyncSocialChannelsResponseSchema,
} from "@spark/core";
export class CreateSocialPostDto extends createZodDto(CreateSocialPostInputSchema) {}
export class SocialPostWriteResponseDto extends createZodDto(SocialPostWriteResponseSchema) {}
export class SyncSocialChannelsResponseDto extends createZodDto(SyncSocialChannelsResponseSchema) {}
