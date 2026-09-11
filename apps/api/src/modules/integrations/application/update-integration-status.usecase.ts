import { Injectable } from "@nestjs/common";
import type { IntegrationConnectionId, IntegrationWriteResponse, OrgId, UpdateIntegrationStatusInput, UserId } from "@spark/core";
import { IntegrationsRepository } from "../infrastructure/integrations.repository.js";
@Injectable()
export class UpdateIntegrationStatusUseCase { constructor(private readonly repository: IntegrationsRepository) {} execute(orgId: OrgId, actorUserId: UserId, id: IntegrationConnectionId, input: UpdateIntegrationStatusInput): Promise<IntegrationWriteResponse> { return this.repository.status(orgId, actorUserId, id, input); } }
