import { createZodDto } from "nestjs-zod";
import {
  CompanyRegistrationSchema,
  ResolveCompanyRegistrationInputSchema,
  ResolveCompanyRegistrationResponseSchema,
} from "@spark/core";

export class CompanyRegistrationDto extends createZodDto(CompanyRegistrationSchema) {}
export class ResolveCompanyRegistrationDto extends createZodDto(ResolveCompanyRegistrationInputSchema) {}
export class ResolveCompanyRegistrationResponseDto extends createZodDto(ResolveCompanyRegistrationResponseSchema) {}
