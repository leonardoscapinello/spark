import { Injectable, NotFoundException } from "@nestjs/common";
import { and, eq, sql } from "drizzle-orm";
import {
  createAppDbClient,   socialChannels,
  socialPosts,
  withOrgContext,
  type SparkDb,
} from "@spark/db";
import {
  socialChannelId,
  type CreateSocialPostInput,
  type IntegrationConnectionId,
  type OrgId,
  type SocialChannel,
  type SocialPost,
  type SocialPostId,
  type UserId,
} from "@spark/core";
import { DomainEventWriter } from "../../events/application/domain-event-writer.js";
import type { ProviderSocialChannel, ProviderSocialPost } from "./buffer-social.adapter.js";

@Injectable()
export class SocialRepository {
  private readonly db: SparkDb = createAppDbClient();
  constructor(private readonly events: DomainEventWriter) {}

  syncChannels(
    orgId: OrgId,
    connectionId: IntegrationConnectionId,
    incoming: ProviderSocialChannel[],
  ): Promise<{ channels: SocialChannel[]; txid: number }> {
    return withOrgContext(this.db, orgId, async (tx) => {
      await tx
        .update(socialChannels)
        .set({ active: false, updatedAt: new Date() })
        .where(and(eq(socialChannels.orgId, orgId), eq(socialChannels.connectionId, connectionId)));
      const now = new Date();
      const rows: Array<typeof socialChannels.$inferSelect> = [];
      for (const channel of incoming) {
        const [row] = await tx
          .insert(socialChannels)
          .values({ id: socialChannelId.create(), orgId, connectionId, ...channel, syncedAt: now })
          .onConflictDoUpdate({
            target: [socialChannels.connectionId, socialChannels.externalId],
            set: {
              service: channel.service,
              name: channel.name,
              avatarUrl: channel.avatarUrl,
              active: channel.active,
              syncedAt: now,
              updatedAt: now,
            },
          })
          .returning();
        if (row) rows.push(row);
      }
      const txid = await captureTxid(tx);
      await this.events.append(tx, {
        orgId,
        type: "social.channels_synced",
        data: { connectionId, count: rows.length },
      });
      return { channels: rows.map(toChannel), txid };
    });
  }

  async reservePost(
    orgId: OrgId,
    actorUserId: UserId,
    input: CreateSocialPostInput,
  ): Promise<{ post: SocialPost; txid: number; externalChannelId: string; inserted: boolean }> {
    return withOrgContext(this.db, orgId, async (tx) => {
      const [existing] = await tx
        .select()
        .from(socialPosts)
        .where(and(eq(socialPosts.orgId, orgId), eq(socialPosts.id, input.id)))
        .limit(1);
      if (existing) {
        const [channel] = await tx
          .select()
          .from(socialChannels)
          .where(and(eq(socialChannels.orgId, orgId), eq(socialChannels.id, existing.channelId)))
          .limit(1);
        if (!channel) throw new NotFoundException("Canal social não encontrado.");
        return {
          post: toPost(existing),
          txid: await captureTxid(tx),
          externalChannelId: channel.externalId,
          inserted: false,
        };
      }
      const [channel] = await tx
        .select()
        .from(socialChannels)
        .where(
          and(
            eq(socialChannels.orgId, orgId),
            eq(socialChannels.id, input.channelId),
            eq(socialChannels.active, true),
          ),
        )
        .limit(1);
      if (!channel) throw new NotFoundException("Canal social ativo não encontrado.");
      const status = input.publishMode === "draft" ? "draft" : "publishing";
      const [row] = await tx
        .insert(socialPosts)
        .values({
          id: input.id,
          orgId,
          channelId: input.channelId,
          connectionId: channel.connectionId,
          createdBy: actorUserId,
          text: input.text,
          status,
          publishMode: input.publishMode,
          scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
        })
        .returning();
      if (!row) throw new Error("Social post insert returned no row.");
      const txid = await captureTxid(tx);
      await this.events.append(tx, {
        orgId,
        type: "social.post_created",
        data: { postId: input.id, channelId: input.channelId, publishMode: input.publishMode },
      });
      return { post: toPost(row), txid, externalChannelId: channel.externalId, inserted: true };
    });
  }

  completePost(
    orgId: OrgId,
    id: SocialPostId,
    provider: ProviderSocialPost,
  ): Promise<{ post: SocialPost; txid: number }> {
    return withOrgContext(this.db, orgId, async (tx) => {
      const status =
        provider.sentAt || provider.providerStatus === "sent" ? "published" : "scheduled";
      const [row] = await tx
        .update(socialPosts)
        .set({
          status,
          externalId: provider.externalId,
          providerStatus: provider.providerStatus,
          scheduledAt: provider.dueAt ? new Date(provider.dueAt) : undefined,
          publishedAt: provider.sentAt ? new Date(provider.sentAt) : null,
          error: null,
          updatedAt: new Date(),
        })
        .where(and(eq(socialPosts.orgId, orgId), eq(socialPosts.id, id)))
        .returning();
      if (!row) throw new NotFoundException("Publicação não encontrada.");
      const txid = await captureTxid(tx);
      await this.events.append(tx, {
        orgId,
        type: status === "published" ? "social.post_published" : "social.post_scheduled",
        data: { postId: id, externalId: provider.externalId },
      });
      return { post: toPost(row), txid };
    });
  }

  failPost(
    orgId: OrgId,
    id: SocialPostId,
    error: string,
  ): Promise<{ post: SocialPost; txid: number }> {
    return withOrgContext(this.db, orgId, async (tx) => {
      const [row] = await tx
        .update(socialPosts)
        .set({ status: "failed", error, updatedAt: new Date() })
        .where(and(eq(socialPosts.orgId, orgId), eq(socialPosts.id, id)))
        .returning();
      if (!row) throw new NotFoundException("Publicação não encontrada.");
      const txid = await captureTxid(tx);
      await this.events.append(tx, {
        orgId,
        type: "social.post_failed",
        data: { postId: id, error },
      });
      return { post: toPost(row), txid };
    });
  }
}

async function captureTxid(tx: SparkDb): Promise<number> {
  const rows = await tx.execute<{ txid: string }>(
    sql`SELECT pg_current_xact_id()::xid::text as txid`,
  );
  if (!rows[0]) throw new Error("Could not obtain transaction id.");
  return Number(rows[0].txid);
}
function toChannel(row: typeof socialChannels.$inferSelect): SocialChannel {
  return {
    ...row,
    syncedAt: row.syncedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  } as SocialChannel;
}
function toPost(row: typeof socialPosts.$inferSelect): SocialPost {
  return {
    ...row,
    scheduledAt: row.scheduledAt?.toISOString() ?? null,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  } as SocialPost;
}
