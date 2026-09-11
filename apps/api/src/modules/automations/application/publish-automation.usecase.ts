import { Injectable } from "@nestjs/common";
import type { AutomationId, AutomationPublishResponse, OrgId, PublishAutomationInput, UserId } from "@spark/core";
import { AutomationsRepository } from "../infrastructure/automations.repository.js";

@Injectable()
export class PublishAutomationUseCase {
  constructor(private readonly repository: AutomationsRepository) {}
  execute(orgId: OrgId, actorUserId: UserId, id: AutomationId, input: PublishAutomationInput): Promise<AutomationPublishResponse> {
    return this.repository.publish(orgId, actorUserId, id, input);
  }
}
