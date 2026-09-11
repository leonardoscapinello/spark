import { Injectable } from "@nestjs/common";
import type {
  CreateSocialPostInput,
  OrgId,
  SocialPostWriteResponse,
  SyncSocialChannelsResponse,
  UserId,
} from "@spark/core";
import { IntegrationRuntimeResolver } from "../../integrations/application/integration-runtime-resolver.service.js";
import { BufferSocialAdapter } from "../infrastructure/buffer-social.adapter.js";
import { SocialRepository } from "../infrastructure/social.repository.js";

@Injectable()
export class SocialService {
  constructor(
    private readonly integrations: IntegrationRuntimeResolver,
    private readonly buffer: BufferSocialAdapter,
    private readonly repository: SocialRepository,
  ) {}

  async syncChannels(orgId: OrgId): Promise<SyncSocialChannelsResponse> {
    const integration = await this.integrations.resolve(orgId, "buffer");
    const apiKey = requiredApiKey(integration.secrets);
    const configuredOrganizationId =
      typeof integration.config.organizationId === "string"
        ? integration.config.organizationId
        : undefined;
    const channels = await this.buffer.listChannels(apiKey, configuredOrganizationId);
    return this.repository.syncChannels(orgId, integration.connectionId, channels);
  }

  async createPost(
    orgId: OrgId,
    actorUserId: UserId,
    input: CreateSocialPostInput,
  ): Promise<SocialPostWriteResponse> {
    const reserved = await this.repository.reservePost(orgId, actorUserId, input);
    if (!reserved.inserted || input.publishMode === "draft")
      return { post: reserved.post, txid: reserved.txid };
    try {
      const integration = await this.integrations.resolve(orgId, "buffer");
      if (integration.connectionId !== reserved.post.connectionId)
        throw new Error("A conexão original deste canal não está ativa.");
      const provider = await this.buffer.createPost(requiredApiKey(integration.secrets), {
        channelId: reserved.externalChannelId,
        text: input.text,
        publishMode: input.publishMode,
        scheduledAt: input.scheduledAt ?? null,
      });
      return this.repository.completePost(orgId, input.id, provider);
    } catch (cause) {
      return this.repository.failPost(
        orgId,
        input.id,
        cause instanceof Error ? cause.message : "Falha desconhecida ao publicar.",
      );
    }
  }
}

function requiredApiKey(secrets: Record<string, string>): string {
  if (!secrets.accessToken) throw new Error("A chave da API do Buffer não foi configurada.");
  return secrets.accessToken;
}
