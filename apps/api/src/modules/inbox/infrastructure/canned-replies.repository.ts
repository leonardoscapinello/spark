import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { and, eq, sql } from "drizzle-orm";
import { cannedReplies, createAppDbClient, withOrgContext, type SparkDb } from "@spark/db";
import { normalizeCannedReplyShortcut, type CannedReply, type CannedReplyId, type CreateCannedReplyInput, type OrgId, type UpdateCannedReplyInput, type UserId } from "@spark/core";
import { DomainEventWriter } from "../../events/application/domain-event-writer.js";

@Injectable()
export class CannedRepliesRepository {
  private readonly db: SparkDb = createAppDbClient();
  constructor(private readonly events: DomainEventWriter) {}

  create(orgId: OrgId, userId: UserId, input: CreateCannedReplyInput) {
    return withOrgContext(this.db, orgId, async (tx) => {
      const shortcut = normalizeCannedReplyShortcut(input.shortcut);
      const duplicate = await tx.select({ id: cannedReplies.id }).from(cannedReplies).where(and(eq(cannedReplies.orgId, orgId), sql`lower(${cannedReplies.shortcut}) = ${shortcut}`)).limit(1);
      if (duplicate.length) throw new ConflictException("Este atalho já está em uso.");
      const [row] = await tx.insert(cannedReplies).values({ ...input, shortcut, orgId, createdBy: userId }).returning();
      if (!row) throw new Error("Canned reply insert returned no row.");
      const txid = await captureTxid(tx);
      await this.events.append(tx, { orgId, type: "canned_reply.created", data: { replyId: row.id, shortcut } });
      return { reply: toReply(row), txid };
    });
  }

  update(orgId: OrgId, id: CannedReplyId, input: UpdateCannedReplyInput) {
    return withOrgContext(this.db, orgId, async (tx) => {
      const shortcut = input.shortcut === undefined ? undefined : normalizeCannedReplyShortcut(input.shortcut);
      if (shortcut) {
        const duplicate = await tx.select({ id: cannedReplies.id }).from(cannedReplies).where(and(eq(cannedReplies.orgId, orgId), sql`lower(${cannedReplies.shortcut}) = ${shortcut}`, sql`${cannedReplies.id} <> ${id}`)).limit(1);
        if (duplicate.length) throw new ConflictException("Este atalho já está em uso.");
      }
      const [row] = await tx.update(cannedReplies).set({ ...input, ...(shortcut ? { shortcut } : {}), updatedAt: new Date() }).where(and(eq(cannedReplies.orgId, orgId), eq(cannedReplies.id, id))).returning();
      if (!row) throw new NotFoundException("Resposta pronta não encontrada.");
      const txid = await captureTxid(tx);
      await this.events.append(tx, { orgId, type: "canned_reply.updated", data: { replyId: id } });
      return { reply: toReply(row), txid };
    });
  }

  archive(orgId: OrgId, id: CannedReplyId, archived: boolean) {
    return withOrgContext(this.db, orgId, async (tx) => {
      const [row] = await tx.update(cannedReplies).set({ archivedAt: archived ? new Date() : null, updatedAt: new Date() }).where(and(eq(cannedReplies.orgId, orgId), eq(cannedReplies.id, id))).returning();
      if (!row) throw new NotFoundException("Resposta pronta não encontrada.");
      const txid = await captureTxid(tx);
      await this.events.append(tx, { orgId, type: "canned_reply.archived", data: { replyId: id, archived } });
      return { reply: toReply(row), txid };
    });
  }
}

function toReply(row: typeof cannedReplies.$inferSelect): CannedReply {
  return { ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(), archivedAt: row.archivedAt?.toISOString() ?? null } as CannedReply;
}

async function captureTxid(tx: Parameters<Parameters<typeof withOrgContext>[2]>[0]): Promise<number> {
  const result = await tx.execute(sql`SELECT pg_current_xact_id()::text::bigint AS txid`);
  return Number(result[0]?.txid ?? 0);
}
