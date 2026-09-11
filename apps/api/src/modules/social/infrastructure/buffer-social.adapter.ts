import { BadGatewayException, Injectable } from "@nestjs/common";
import { SOCIAL_SERVICES, type SocialPublishMode, type SocialService } from "@spark/core";

const BUFFER_ENDPOINT = "https://api.buffer.com";

export interface ProviderSocialChannel {
  externalId: string;
  service: SocialService;
  name: string;
  avatarUrl: string | null;
  active: boolean;
}

export interface ProviderSocialPost {
  externalId: string;
  providerStatus: string;
  dueAt: string | null;
  sentAt: string | null;
}

@Injectable()
export class BufferSocialAdapter {
  async listChannels(
    apiKey: string,
    configuredOrganizationId?: string,
  ): Promise<ProviderSocialChannel[]> {
    const organizationId = configuredOrganizationId || (await this.discoverOrganization(apiKey));
    const data = await this.request<{
      channels: Array<{
        id: string;
        name: string;
        displayName: string | null;
        service: string;
        avatar: string;
        isDisconnected: boolean;
        isLocked: boolean;
      }>;
    }>(
      apiKey,
      `query SparkChannels($input: ChannelsInput!) { channels(input: $input) { id name displayName service avatar isDisconnected isLocked } }`,
      { input: { organizationId } },
    );
    return data.channels.flatMap((channel) => {
      if (!(SOCIAL_SERVICES as readonly string[]).includes(channel.service)) return [];
      return [
        {
          externalId: channel.id,
          service: channel.service as SocialService,
          name: channel.displayName || channel.name,
          avatarUrl: channel.avatar || null,
          active: !channel.isDisconnected && !channel.isLocked,
        },
      ];
    });
  }

  async createPost(
    apiKey: string,
    input: {
      channelId: string;
      text: string;
      publishMode: SocialPublishMode;
      scheduledAt: string | null;
    },
  ): Promise<ProviderSocialPost> {
    const mode =
      input.publishMode === "now"
        ? "shareNow"
        : input.publishMode === "schedule"
          ? "customScheduled"
          : "addToQueue";
    const variables = {
      input: {
        text: input.text,
        channelId: input.channelId,
        schedulingType: "automatic",
        mode,
        assets: [],
        needsApproval: false,
        ...(input.scheduledAt ? { dueAt: input.scheduledAt } : {}),
      },
    };
    const data = await this.request<{
      createPost: {
        __typename: string;
        message?: string;
        post?: { id: string; status: string; dueAt: string | null; sentAt: string | null };
      };
    }>(
      apiKey,
      `mutation SparkCreatePost($input: CreatePostInput!) { createPost(input: $input) { __typename ... on PostActionSuccess { post { id status dueAt sentAt } } ... on MutationError { message } } }`,
      variables,
    );
    const payload = data.createPost;
    if (!payload.post)
      throw new BadGatewayException(payload.message || "O Buffer recusou a publicação.");
    return {
      externalId: payload.post.id,
      providerStatus: payload.post.status,
      dueAt: payload.post.dueAt,
      sentAt: payload.post.sentAt,
    };
  }

  private async discoverOrganization(apiKey: string): Promise<string> {
    const data = await this.request<{ account: { organizations: Array<{ id: string }> } }>(
      apiKey,
      `query SparkOrganizations { account { organizations { id } } }`,
      {},
    );
    const id = data.account.organizations[0]?.id;
    if (!id) throw new BadGatewayException("Nenhuma organização foi encontrada na conta Buffer.");
    return id;
  }

  private async request<T>(
    apiKey: string,
    query: string,
    variables: Record<string, unknown>,
  ): Promise<T> {
    const response = await fetch(BUFFER_ENDPOINT, {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(30_000),
    }).catch((cause: unknown) => {
      throw new BadGatewayException(
        cause instanceof Error ? cause.message : "O Buffer não respondeu.",
      );
    });
    if (!response.ok) throw new BadGatewayException(`O Buffer respondeu HTTP ${response.status}.`);
    const body = (await response.json()) as { data?: T; errors?: Array<{ message?: string }> };
    if (!body.data || body.errors?.length)
      throw new BadGatewayException(
        body.errors?.[0]?.message || "O Buffer retornou uma resposta inválida.",
      );
    return body.data;
  }
}
