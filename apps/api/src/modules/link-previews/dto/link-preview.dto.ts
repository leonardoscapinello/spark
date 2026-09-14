import { createZodDto } from "nestjs-zod";
import { LinkPreviewSchema, ResolveLinkPreviewInputSchema, ResolveLinkPreviewResponseSchema } from "@spark/core";

export class LinkPreviewDto extends createZodDto(LinkPreviewSchema) {}
export class ResolveLinkPreviewDto extends createZodDto(ResolveLinkPreviewInputSchema) {}
export class ResolveLinkPreviewResponseDto extends createZodDto(ResolveLinkPreviewResponseSchema) {}
