import { Injectable } from "@nestjs/common";
import type { IntegrationConnectionId, OrgId, SyncWhatsAppTemplatesResponse } from "@spark/core";
import { WhatsAppTemplatesRepository } from "../infrastructure/whatsapp-templates.repository.js";

@Injectable()
export class SyncWhatsAppTemplatesUseCase {
  constructor(private readonly templates: WhatsAppTemplatesRepository) {}
  async execute(orgId: OrgId, connectionId: IntegrationConnectionId): Promise<SyncWhatsAppTemplatesResponse> {
    return { templates: await this.templates.sync(orgId, connectionId) };
  }
}
