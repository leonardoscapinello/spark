import { Injectable } from "@nestjs/common";
import type { AutomationId, OrgId, StartAutomationRunInput, StartAutomationRunResponse, UserId } from "@spark/core";
import { AutomationsRepository } from "../infrastructure/automations.repository.js";

@Injectable()
export class StartAutomationRunUseCase {
  constructor(private readonly repository: AutomationsRepository) {}
  execute(orgId: OrgId, actorUserId: UserId, id: AutomationId, input: StartAutomationRunInput): Promise<StartAutomationRunResponse> { return this.repository.startRun(orgId, actorUserId, id, input); }
}
