import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { and, eq, sql } from "drizzle-orm";
import { contacts, conversations, createAppDbClient, messages, teams, users, withOrgContext, type SparkDb } from "@spark/db";
import { firstResponseDueAt, type AddInternalNoteInput, type Conversation, type ConversationId, type ConversationWriteResponse, type CreateConversationInput, type Message, type MessageWriteResponse, type OrgId, type UpdateConversationInput, type UserId } from "@spark/core";
import { DomainEventWriter } from "../../events/application/domain-event-writer.js";

@Injectable()
export class InboxRepository {
  private readonly db: SparkDb;
  constructor(private readonly events: DomainEventWriter) {
    this.db = createAppDbClient();
  }

  createConversation(orgId: OrgId, actorUserId: UserId, input: CreateConversationInput): Promise<ConversationWriteResponse> {
    return withOrgContext(this.db, orgId, async (tx) => {
      const contact = await tx.select({ id: contacts.id }).from(contacts).where(and(eq(contacts.id, input.contactId), eq(contacts.orgId, orgId), sql`${contacts.deletedAt} IS NULL`)).limit(1);
      if (!contact[0]) throw new BadRequestException("Contact is not available in this organization.");
      const now = new Date();
      const txid = await captureTxid(tx);
      const [row] = await tx.insert(conversations).values({
        id: input.id,
        orgId,
        contactId: input.contactId,
        channel: input.channel,
        subject: input.subject,
        assigneeId: actorUserId,
        firstResponseDueAt: new Date(firstResponseDueAt(now, "normal")),
      }).returning();
      if (!row) throw new Error("Conversation insert returned no row.");
      const conversation = toConversation(row);
      await this.events.append(tx, { orgId, contactId: conversation.contactId, type: "conversation.created", data: { conversationId: conversation.id, channel: conversation.channel, subject: conversation.subject } });
      return { conversation, txid };
    });
  }

  updateConversation(orgId: OrgId, actorUserId: UserId, id: ConversationId, input: UpdateConversationInput): Promise<ConversationWriteResponse> {
    return withOrgContext(this.db, orgId, async (tx) => {
      const [current] = await tx.select().from(conversations).where(and(eq(conversations.id, id), eq(conversations.orgId, orgId))).limit(1);
      if (!current) throw new NotFoundException(`Conversation ${id} not found.`);
      if (input.assigneeId) {
        const assignee = await tx.select({ id: users.id }).from(users).where(and(eq(users.id, input.assigneeId), eq(users.orgId, orgId), sql`${users.deactivatedAt} IS NULL`)).limit(1);
        if (!assignee[0]) throw new BadRequestException("Assignee is not active in this organization.");
      }
      if (input.teamId) {
        const team = await tx.select({ id: teams.id }).from(teams).where(and(eq(teams.id, input.teamId), eq(teams.orgId, orgId), sql`${teams.archivedAt} IS NULL`)).limit(1);
        if (!team[0]) throw new BadRequestException("Team is not active in this organization.");
      }
      const txid = await captureTxid(tx);
      const [row] = await tx.update(conversations).set({
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.priority !== undefined ? { priority: input.priority } : {}),
        ...(input.assigneeId !== undefined ? { assigneeId: input.assigneeId } : {}),
        ...(input.teamId !== undefined ? { teamId: input.teamId } : {}),
        ...(input.snoozedUntil !== undefined ? { snoozedUntil: input.snoozedUntil ? new Date(input.snoozedUntil) : null } : {}),
        ...(input.priority !== undefined && current.firstRespondedAt === null ? { firstResponseDueAt: new Date(firstResponseDueAt(current.createdAt, input.priority)) } : {}),
        ...(input.status === "closed" && current.status !== "closed" ? { resolvedAt: new Date() } : {}),
        ...(input.status === "open" && current.status === "closed" ? { resolvedAt: null } : {}),
        updatedAt: new Date(),
      }).where(and(eq(conversations.id, id), eq(conversations.orgId, orgId))).returning();
      if (!row) throw new NotFoundException(`Conversation ${id} not found.`);
      const conversation = toConversation(row);
      const eventType = input.status === "closed" ? "conversation.closed" : input.status === "open" ? "conversation.reopened" : "conversation.updated";
      await this.events.append(tx, { orgId, contactId: conversation.contactId, type: eventType, data: { conversationId: conversation.id, actorUserId, changes: input } });
      return { conversation, txid };
    });
  }

  addInternalNote(orgId: OrgId, actorUserId: UserId, conversationId: ConversationId, input: AddInternalNoteInput): Promise<MessageWriteResponse> {
    return withOrgContext(this.db, orgId, async (tx) => {
      const existing = await tx.select().from(conversations).where(and(eq(conversations.id, conversationId), eq(conversations.orgId, orgId))).limit(1);
      const current = existing[0];
      if (!current) throw new NotFoundException(`Conversation ${conversationId} not found.`);
      const now = new Date();
      const txid = await captureTxid(tx);
      const [messageRow] = await tx.insert(messages).values({ id: input.id, orgId, conversationId, contactId: current.contactId, authorUserId: actorUserId, direction: "internal", status: "sent", body: input.body, createdAt: now }).returning();
      const [conversationRow] = await tx.update(conversations).set({ lastMessageAt: now, updatedAt: now }).where(eq(conversations.id, conversationId)).returning();
      if (!messageRow || !conversationRow) throw new Error("Inbox write returned no row.");
      const message = toMessage(messageRow);
      const conversation = toConversation(conversationRow);
      await this.events.append(tx, { orgId, contactId: conversation.contactId, type: "message.note_added", data: { conversationId, messageId: message.id, actorUserId } });
      return { message, conversation, txid };
    });
  }
}

async function captureTxid(tx: SparkDb): Promise<number> {
  const rows = await tx.execute<{ txid: string }>(sql`SELECT pg_current_xact_id()::xid::text as txid`);
  if (!rows[0]) throw new Error("Could not obtain transaction id.");
  return Number(rows[0].txid);
}

function toConversation(row: typeof conversations.$inferSelect): Conversation {
  return { ...row, snoozedUntil: row.snoozedUntil?.toISOString() ?? null, firstResponseDueAt: row.firstResponseDueAt.toISOString(), firstRespondedAt: row.firstRespondedAt?.toISOString() ?? null, resolvedAt: row.resolvedAt?.toISOString() ?? null, lastMessageAt: row.lastMessageAt.toISOString(), createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() } as Conversation;
}

function toMessage(row: typeof messages.$inferSelect): Message {
  return { ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(), deletedAt: row.deletedAt?.toISOString() ?? null } as Message;
}
