import { Injectable } from "@nestjs/common";
import type { Deal, DealId, EditDealInput, OrgId } from "@spark/core";
import { DealsRepository } from "../infrastructure/deals.repository.js";

@Injectable()
export class EditDealUseCase {
  constructor(private readonly dealsRepository: DealsRepository) {}

  async execute(orgId: OrgId, dealId: DealId, input: EditDealInput): Promise<{ deal: Deal; txid: number }> {
    return this.dealsRepository.edit(orgId, dealId, input);
  }
}
