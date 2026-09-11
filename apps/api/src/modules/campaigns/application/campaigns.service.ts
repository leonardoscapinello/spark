import { Injectable } from "@nestjs/common";
import type { CampaignId, CreateAudienceInput, CreateCampaignInput, OrgId, UserId } from "@spark/core";
import { EmailDeliveryService } from "../../integrations/application/email-delivery.service.js";
import { CampaignsRepository } from "../infrastructure/campaigns.repository.js";
@Injectable()
export class CampaignsService {
  constructor(private readonly repository: CampaignsRepository, private readonly email: EmailDeliveryService) {}
  createAudience(orgId: OrgId, userId: UserId, input: CreateAudienceInput) { return this.repository.createAudience(orgId, userId, input); }
  createCampaign(orgId: OrgId, userId: UserId, input: CreateCampaignInput) { return this.repository.createCampaign(orgId, userId, input); }
  async send(orgId: OrgId, id: CampaignId) { const prepared = await this.repository.prepareSend(orgId, id); for (const recipient of prepared.recipients) { try { const providerMessageId = await this.email.send(orgId, { to: recipient.email, subject: prepared.campaign.subject, text: prepared.campaign.body }); await this.repository.markRecipient(orgId, recipient.id, { providerMessageId }); } catch (cause) { await this.repository.markRecipient(orgId, recipient.id, { error: cause instanceof Error ? cause.message : "Falha desconhecida" }); } } return this.repository.finishSend(orgId, id); }
}
