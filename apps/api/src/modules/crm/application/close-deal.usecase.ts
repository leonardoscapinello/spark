import { Injectable } from "@nestjs/common";
import type { Deal, OrgId, DealId, CloseDealInput, UserId } from "@spark/core";
import { DealsRepository } from "../infrastructure/deals.repository.js";

@Injectable()
export class CloseDealUseCase {
  constructor(private readonly dealsRepository: DealsRepository) {}

  async execute(orgId: OrgId, actorUserId: UserId, dealId: DealId, input: CloseDealInput): Promise<{ deal: Deal; txid: number }> {
    return this.dealsRepository.close(orgId, actorUserId, dealId, input);
  }
}
