import { createZodDto } from "nestjs-zod";
import {
  ContactSchema,
  CreateContactInputSchema,
  CreateContactResponseSchema,
  UpdateContactInputSchema,
  UpdateContactResponseSchema,
} from "@spark/core";

/** No field hand-written — born from core's Zod schema (ADR-0004, ADR-0019). */
export class ContactDto extends createZodDto(ContactSchema) {}
export class CreateContactDto extends createZodDto(CreateContactInputSchema) {}
export class CreateContactResponseDto extends createZodDto(CreateContactResponseSchema) {}
export class UpdateContactDto extends createZodDto(UpdateContactInputSchema) {}
export class UpdateContactResponseDto extends createZodDto(UpdateContactResponseSchema) {}
