import { Injectable } from "@nestjs/common";
import type { Deal, DealId, EditDealInput, OrgId, UserId } from "@spark/core";
import { DealsRepository } from "../infrastructure/deals.repository.js";

@Injectable()
export class EditDealUseCase {
  constructor(private readonly dealsRepository: DealsRepository) {}

  async execute(orgId: OrgId, actorUserId: UserId, dealId: DealId, input: EditDealInput): Promise<{ deal: Deal; txid: number }> {
    return this.dealsRepository.edit(orgId, actorUserId, dealId, input);
  }
}
