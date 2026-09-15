import { Injectable } from "@nestjs/common";
import type { ConfigureStageInput, OrgId, Stage, StageId } from "@spark/core";
import { StagesRepository } from "../infrastructure/stages.repository.js";

@Injectable()
export class ConfigureStageUseCase {
  constructor(private readonly stagesRepository: StagesRepository) {}
  execute(orgId: OrgId, id: StageId, input: ConfigureStageInput): Promise<{ stage: Stage; txid: number }> {
    return this.stagesRepository.configure(orgId, id, input);
  }
}
