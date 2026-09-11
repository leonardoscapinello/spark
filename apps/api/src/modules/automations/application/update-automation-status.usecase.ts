import { Injectable } from "@nestjs/common";
import type { AutomationId, AutomationWriteResponse, OrgId, UpdateAutomationStatusInput, UserId } from "@spark/core";
import { AutomationsRepository } from "../infrastructure/automations.repository.js";

@Injectable()
export class UpdateAutomationStatusUseCase {
  constructor(private readonly repository: AutomationsRepository) {}
  execute(orgId: OrgId, actorUserId: UserId, id: AutomationId, input: UpdateAutomationStatusInput): Promise<AutomationWriteResponse> {
    return this.repository.updateStatus(orgId, actorUserId, id, input);
  }
}
