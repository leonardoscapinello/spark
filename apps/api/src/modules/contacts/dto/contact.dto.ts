import { createZodDto } from "nestjs-zod";
import {
  ContactSchema,
  CreateContactInputSchema,
  CreateContactResponseSchema,
  UpdateContactInputSchema,
  UpdateContactArchiveInputSchema,
  UpdateContactResponseSchema,
  ImportContactsInputSchema,
  ImportContactsResponseSchema,
  SearchContactsQuerySchema,
  SearchContactsResponseSchema,
} from "@spark/core";

/** No field hand-written — born from core's Zod schema (ADR-0004, ADR-0019). */
export class ContactDto extends createZodDto(ContactSchema) {}
export class CreateContactDto extends createZodDto(CreateContactInputSchema) {}
export class CreateContactResponseDto extends createZodDto(CreateContactResponseSchema) {}
export class UpdateContactDto extends createZodDto(UpdateContactInputSchema) {}
export class UpdateContactArchiveDto extends createZodDto(UpdateContactArchiveInputSchema) {}
export class UpdateContactResponseDto extends createZodDto(UpdateContactResponseSchema) {}
export class ImportContactsDto extends createZodDto(ImportContactsInputSchema) {}
export class ImportContactsResponseDto extends createZodDto(ImportContactsResponseSchema) {}
export class SearchContactsQueryDto extends createZodDto(SearchContactsQuerySchema) {}
export class SearchContactsResponseDto extends createZodDto(SearchContactsResponseSchema) {}
