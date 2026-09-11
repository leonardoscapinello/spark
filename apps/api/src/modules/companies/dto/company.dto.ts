import { createZodDto } from "nestjs-zod";
import { CompanySchema, CompanyWriteResponseSchema, CreateCompanyInputSchema, UpdateCompanyArchiveInputSchema, UpdateCompanyInputSchema } from "@spark/core";

export class CompanyDto extends createZodDto(CompanySchema) {}
export class CreateCompanyDto extends createZodDto(CreateCompanyInputSchema) {}
export class UpdateCompanyDto extends createZodDto(UpdateCompanyInputSchema) {}
export class UpdateCompanyArchiveDto extends createZodDto(UpdateCompanyArchiveInputSchema) {}
export class CompanyWriteResponseDto extends createZodDto(CompanyWriteResponseSchema) {}
