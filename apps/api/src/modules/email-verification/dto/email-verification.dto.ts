import { createZodDto } from "nestjs-zod";
import { VerifyEmailInputSchema, VerifyEmailResponseSchema } from "@spark/core";

export class VerifyEmailDto extends createZodDto(VerifyEmailInputSchema) {}
export class VerifyEmailResponseDto extends createZodDto(VerifyEmailResponseSchema) {}
