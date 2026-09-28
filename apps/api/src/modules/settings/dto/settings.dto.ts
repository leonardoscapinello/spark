import { createZodDto } from "nestjs-zod"; import { ArchiveCustomFieldInputSchema, CreateCustomFieldInputSchema, CustomFieldWriteResponseSchema, OrganizationThemeWriteResponseSchema, UpdateCustomFieldOptionsInputSchema, UpdateOrganizationThemeInputSchema } from "@spark/core";
export class CreateCustomFieldDto extends createZodDto(CreateCustomFieldInputSchema) {} export class ArchiveCustomFieldDto extends createZodDto(ArchiveCustomFieldInputSchema) {} export class CustomFieldWriteResponseDto extends createZodDto(CustomFieldWriteResponseSchema) {}
export class UpdateCustomFieldOptionsDto extends createZodDto(UpdateCustomFieldOptionsInputSchema) {}
export class UpdateOrganizationThemeDto extends createZodDto(UpdateOrganizationThemeInputSchema) {}
export class OrganizationThemeWriteResponseDto extends createZodDto(OrganizationThemeWriteResponseSchema) {}
