import { Injectable } from "@nestjs/common";
import type { IntegrationConnectionId, IntegrationWriteResponse, OrgId, UserId } from "@spark/core";
import { IntegrationsRepository } from "../infrastructure/integrations.repository.js";
@Injectable()
export class CheckIntegrationUseCase { constructor(private readonly repository: IntegrationsRepository) {} execute(orgId: OrgId, actorUserId: UserId, id: IntegrationConnectionId): Promise<IntegrationWriteResponse> { return this.repository.check(orgId, actorUserId, id); } }
