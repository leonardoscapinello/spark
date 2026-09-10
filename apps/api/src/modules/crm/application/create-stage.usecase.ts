import { Injectable } from "@nestjs/common";
import type { Stage, CreateStageInput, OrgId } from "@spark/core";
import { StagesRepository } from "../infrastructure/stages.repository.js";

@Injectable()
export class CreateStageUseCase {
  constructor(private readonly stagesRepository: StagesRepository) {}

  async execute(orgId: OrgId, input: CreateStageInput): Promise<{ stage: Stage; txid: number }> {
    return this.stagesRepository.create(orgId, input);
  }
}
