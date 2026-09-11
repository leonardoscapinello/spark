import { Injectable } from "@nestjs/common";
import type { Company, CompanyId, OrgId, UpdateCompanyInput } from "@spark/core";
import { CompaniesRepository } from "../infrastructure/companies.repository.js";

@Injectable()
export class UpdateCompanyUseCase {
  constructor(private readonly repository: CompaniesRepository) {}
  execute(orgId: OrgId, id: CompanyId, input: UpdateCompanyInput): Promise<{ company: Company; txid: number }> { return this.repository.update(orgId, id, input); }
}
