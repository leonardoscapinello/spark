import { Injectable } from "@nestjs/common";
import type { Stage, OrgId, StageId } from "@spark/core";
import { StagesRepository } from "../infrastructure/stages.repository.js";

@Injectable()
export class RenameStageUseCase {
  constructor(private readonly stagesRepository: StagesRepository) {}

  async execute(orgId: OrgId, id: StageId, name: string): Promise<{ stage: Stage; txid: number }> {
    return this.stagesRepository.rename(orgId, id, name);
  }
}
