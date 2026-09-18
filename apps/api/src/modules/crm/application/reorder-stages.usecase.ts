import { BadRequestException, Injectable } from "@nestjs/common";
import { isValidStageOrder, type OrgId, type PipelineId, type Stage, type StageId } from "@spark/core";
import { StagesRepository } from "../infrastructure/stages.repository.js";

@Injectable()
export class ReorderStagesUseCase {
  constructor(private readonly stagesRepository: StagesRepository) {}

  async execute(orgId: OrgId, pipelineId: PipelineId, orderedIds: readonly StageId[]): Promise<{ stages: Stage[]; txid: number }> {
    const current = await this.stagesRepository.listActiveIds(orgId, pipelineId);
    if (!isValidStageOrder(current, orderedIds)) {
      throw new BadRequestException("A nova ordem precisa conter exatamente as etapas atuais do funil, sem repetir nem faltar nenhuma.");
    }
    return this.stagesRepository.reorder(orgId, pipelineId, orderedIds);
  }
}
