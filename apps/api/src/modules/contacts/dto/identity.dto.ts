import { createZodDto } from "nestjs-zod";
import { AddContactIdentityInputSchema, CreateIdentityResponseSchema } from "@spark/core";

export class AddContactIdentityDto extends createZodDto(AddContactIdentityInputSchema) {}
export class CreateIdentityResponseDto extends createZodDto(CreateIdentityResponseSchema) {}
