import { Injectable } from "@nestjs/common";
import type { IntegrationWriteResponse, OrgId, UpsertIntegrationInput, UserId } from "@spark/core";
import { IntegrationsRepository } from "../infrastructure/integrations.repository.js";
@Injectable()
export class UpsertIntegrationUseCase { constructor(private readonly repository: IntegrationsRepository) {} execute(orgId: OrgId, actorUserId: UserId, input: UpsertIntegrationInput): Promise<IntegrationWriteResponse> { return this.repository.upsert(orgId, actorUserId, input); } }
