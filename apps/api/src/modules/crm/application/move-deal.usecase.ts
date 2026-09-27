import { Injectable } from "@nestjs/common";
import type { Deal, OrgId, DealId, StageId, PipelineId, UserId } from "@spark/core";
import { DealsRepository } from "../infrastructure/deals.repository.js";

@Injectable()
export class MoveDealUseCase {
  constructor(private readonly dealsRepository: DealsRepository) {}

  async execute(orgId: OrgId, actorUserId: UserId, dealId: DealId, stageId: StageId, pipelineId?: PipelineId): Promise<{ deal: Deal; txid: number }> {
    return this.dealsRepository.move(orgId, actorUserId, dealId, stageId, pipelineId);
  }
}
