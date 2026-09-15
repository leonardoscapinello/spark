import { Injectable } from "@nestjs/common";
import type { Deal, DealId, OrgId } from "@spark/core";
import { DealsRepository } from "../infrastructure/deals.repository.js";

@Injectable()
export class ReopenDealUseCase {
  constructor(private readonly dealsRepository: DealsRepository) {}

  execute(orgId: OrgId, dealId: DealId): Promise<{ deal: Deal; txid: number }> {
    return this.dealsRepository.reopen(orgId, dealId);
  }
}
