import { createZodDto } from "nestjs-zod";
import { ContactSchema, CreateContactInputSchema, CreateContactResponseSchema } from "@spark/core";

/** Nenhum campo escrito à mão — os três nascem do schema Zod de core (ADR-0004, ADR-0019). */
export class ContactDto extends createZodDto(ContactSchema) {}
export class CreateContactDto extends createZodDto(CreateContactInputSchema) {}
export class CreateContactResponseDto extends createZodDto(CreateContactResponseSchema) {}
