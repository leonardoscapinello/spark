import { Injectable } from "@nestjs/common";
import type { AutomationId, AutomationWriteResponse, OrgId, UpdateAutomationDraftInput, UserId } from "@spark/core";
import { AutomationsRepository } from "../infrastructure/automations.repository.js";

@Injectable()
export class UpdateAutomationDraftUseCase {
  constructor(private readonly repository: AutomationsRepository) {}
  execute(orgId: OrgId, actorUserId: UserId, id: AutomationId, input: UpdateAutomationDraftInput): Promise<AutomationWriteResponse> {
    return this.repository.updateDraft(orgId, actorUserId, id, input);
  }
}
