import { BadRequestException, Injectable } from "@nestjs/common";
import { canArchiveStage, type Stage, type OrgId, type StageId } from "@spark/core";
import { StagesRepository } from "../infrastructure/stages.repository.js";

@Injectable()
export class ArchiveStageUseCase {
  constructor(private readonly stagesRepository: StagesRepository) {}

  async execute(orgId: OrgId, id: StageId, archived: boolean): Promise<{ stage: Stage; txid: number }> {
    if (archived) {
      const openDeals = await this.stagesRepository.countOpenDeals(orgId, id);
      if (!canArchiveStage(openDeals)) {
        throw new BadRequestException(
          openDeals === 1
            ? "Esta etapa tem 1 negócio aberto. Mova-o para outra etapa antes de arquivar."
            : `Esta etapa tem ${openDeals} negócios abertos. Mova-os para outra etapa antes de arquivar.`,
        );
      }
    }
    return this.stagesRepository.archive(orgId, id, archived);
  }
}
