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

import { MergeContactInputSchema, MergeContactResponseSchema } from "@spark/core";
export class MergeContactDto extends createZodDto(MergeContactInputSchema) {}
export class MergeContactResponseDto extends createZodDto(MergeContactResponseSchema) {}

import { LinkContactCompanyInputSchema, LinkContactCompanyResponseSchema } from "@spark/core";
export class LinkContactCompanyDto extends createZodDto(LinkContactCompanyInputSchema) {}
export class LinkContactCompanyResponseDto extends createZodDto(LinkContactCompanyResponseSchema) {}
