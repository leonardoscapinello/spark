import { BadGatewayException, Injectable, NotFoundException } from "@nestjs/common";
import { and, eq, sql } from "drizzle-orm";
import { conversations, createAppDbClient, messages, withOrgContext, type SparkDb } from "@spark/db";
import type { ContactId, Conversation, ConversationId, Message, MessageWriteResponse, OrgId, SendMessageInput, UserId } from "@spark/core";
import { DomainEventWriter } from "../../events/application/domain-event-writer.js";
import { ChannelSender } from "./channel-sender.service.js";
@Injectable()
export class OutboundMessagesRepository {
  private readonly db: SparkDb = createAppDbClient();
  constructor(private readonly sender: ChannelSender, private readonly events: DomainEventWriter) {}
  async send(orgId: OrgId, actorUserId: UserId, conversationId: ConversationId, input: SendMessageInput): Promise<MessageWriteResponse> {
    const queued = await withOrgContext(this.db, orgId, async (tx) => {
      const [conversation] = await tx.select().from(conversations).where(and(eq(conversations.id, conversationId), eq(conversations.orgId, orgId))).limit(1);
      if (!conversation) throw new NotFoundException("Conversa não encontrada.");
      const now = new Date();
      const body = input.body?.trim() || "Anexo";
      const [message] = await tx.insert(messages).values({ id: input.id, orgId, conversationId, contactId: conversation.contactId, authorUserId: actorUserId, direction: "outbound", status: "queued", body, attachmentFileId: input.attachmentFileId ?? null, createdAt: now }).returning();
      await tx.update(conversations).set({ lastMessageAt: now, updatedAt: now }).where(eq(conversations.id, conversationId));
      if (!message) throw new Error("Não foi possível enfileirar a mensagem.");
      await this.events.append(tx, { orgId, contactId: conversation.contactId as ContactId, type: "message.queued", data: { messageId: input.id, conversationId } });
      return conversation;
    });
    try {
      const externalId = await this.sender.send(orgId, queued.contactId as Message["contactId"], queued.channel as Conversation["channel"], queued.subject, input.body?.trim() ?? "", input.attachmentFileId);
      return withOrgContext(this.db, orgId, async (tx) => {
        const sentAt = new Date();
        const [message] = await tx.update(messages).set({ status: "sent", externalId }).where(and(eq(messages.id, input.id), eq(messages.orgId, orgId))).returning();
        const [conversation] = await tx.update(conversations).set({ firstRespondedAt: queued.firstRespondedAt ?? sentAt, updatedAt: sentAt }).where(and(eq(conversations.id, conversationId), eq(conversations.orgId, orgId))).returning();
        if (!message || !conversation) throw new Error("Mensagem enviada não encontrada.");
        const txid = await captureTxid(tx);
        await this.events.append(tx, { orgId, contactId: message.contactId as ContactId, type: "message.sent", data: { messageId: message.id, conversationId, externalId } });
        return { message: toMessage(message), conversation: toConversation(conversation), txid };
      });
    } catch (cause) {
      await withOrgContext(this.db, orgId, async (tx) => {
        await tx.update(messages).set({ status: "failed" }).where(and(eq(messages.id, input.id), eq(messages.orgId, orgId)));
        await this.events.append(tx, { orgId, contactId: queued.contactId as ContactId, type: "message.failed", data: { messageId: input.id, conversationId } });
      });
      throw new BadGatewayException(cause instanceof Error ? cause.message : "Falha ao enviar mensagem.");
    }
  }
}
async function captureTxid(tx: SparkDb): Promise<number> { const rows = await tx.execute<{ txid: string }>(sql`SELECT pg_current_xact_id()::xid::text as txid`); if (!rows[0]) throw new Error("Could not obtain transaction id."); return Number(rows[0].txid); }
function toMessage(row: typeof messages.$inferSelect): Message { return { ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(), deletedAt: row.deletedAt?.toISOString() ?? null } as Message; }
function toConversation(row: typeof conversations.$inferSelect): Conversation { return { ...row, snoozedUntil: row.snoozedUntil?.toISOString() ?? null, firstResponseDueAt: row.firstResponseDueAt.toISOString(), firstRespondedAt: row.firstRespondedAt?.toISOString() ?? null, resolvedAt: row.resolvedAt?.toISOString() ?? null, lastInboundMessageAt: row.lastInboundMessageAt?.toISOString() ?? null, lastMessageAt: row.lastMessageAt.toISOString(), createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() } as Conversation; }
