import { Injectable } from "@nestjs/common";
import type { Company, CreateCompanyInput, OrgId } from "@spark/core";
import { CompaniesRepository } from "../infrastructure/companies.repository.js";

@Injectable()
export class CreateCompanyUseCase {
  constructor(private readonly repository: CompaniesRepository) {}
  execute(orgId: OrgId, input: CreateCompanyInput): Promise<{ company: Company; txid: number }> { return this.repository.create(orgId, input); }
}
