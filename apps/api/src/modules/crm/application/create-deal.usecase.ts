import { Injectable } from "@nestjs/common";
import type { Deal, CreateDealInput, OrgId, UserId } from "@spark/core";
import { DealsRepository } from "../infrastructure/deals.repository.js";

@Injectable()
export class CreateDealUseCase {
  constructor(private readonly dealsRepository: DealsRepository) {}

  async execute(orgId: OrgId, actorUserId: UserId, input: CreateDealInput): Promise<{ deal: Deal; txid: number }> {
    return this.dealsRepository.create(orgId, actorUserId, input);
  }
}
