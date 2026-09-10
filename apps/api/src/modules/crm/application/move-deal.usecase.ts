import { Injectable } from "@nestjs/common";
import type { Deal, OrgId, DealId, StageId } from "@spark/core";
import { DealsRepository } from "../infrastructure/deals.repository.js";

@Injectable()
export class MoveDealUseCase {
  constructor(private readonly dealsRepository: DealsRepository) {}

  async execute(orgId: OrgId, dealId: DealId, stageId: StageId): Promise<{ deal: Deal; txid: number }> {
    return this.dealsRepository.move(orgId, dealId, stageId);
  }
}
