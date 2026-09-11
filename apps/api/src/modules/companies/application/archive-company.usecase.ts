import { Injectable } from "@nestjs/common";
import type { Company, CompanyId, OrgId } from "@spark/core";
import { CompaniesRepository } from "../infrastructure/companies.repository.js";

@Injectable()
export class ArchiveCompanyUseCase {
  constructor(private readonly repository: CompaniesRepository) {}
  execute(orgId: OrgId, id: CompanyId, archived: boolean): Promise<{ company: Company; txid: number }> { return this.repository.archive(orgId, id, archived); }
}
