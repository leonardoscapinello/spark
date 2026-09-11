import { Injectable } from "@nestjs/common";
import type { AutomationWriteResponse, CreateAutomationInput, OrgId, UserId } from "@spark/core";
import { AutomationsRepository } from "../infrastructure/automations.repository.js";

@Injectable()
export class CreateAutomationUseCase {
  constructor(private readonly repository: AutomationsRepository) {}
  execute(orgId: OrgId, actorUserId: UserId, input: CreateAutomationInput): Promise<AutomationWriteResponse> {
    return this.repository.create(orgId, actorUserId, input);
  }
}
