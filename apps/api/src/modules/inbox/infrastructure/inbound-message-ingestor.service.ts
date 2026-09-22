import { Injectable } from "@nestjs/common";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { contacts, conversations, createAppDbClient, identities, messages, withOrgContext, type SparkDb } from "@spark/db";
import { contactId, conversationId, firstResponseDueAt, identityId, normalizeIdentityValue, type ContactId, type ConversationChannel, type ConversationId, type IdentityChannel, type OrgId } from "@spark/core";
import { DomainEventWriter } from "../../events/application/domain-event-writer.js";

export interface InboundIngestParams {
  channel: ConversationChannel & IdentityChannel;
  externalId: string;
  /** Valor cru do remetente — a normalização (telefone, e-mail, @handle...) é responsabilidade daqui, não do chamador. */
  senderId: string;
  contactName: string;
  /** Usa o valor já normalizado da identidade (mesmo que fica em identities.externalValue) — nunca o valor cru. */
  setContactPhone?: boolean;
  setContactEmail?: boolean;
  conversationSubject: string;
  occurredAt: Date;
  insertMessage: (tx: SparkDb, leadId: ContactId, threadId: ConversationId) => Promise<string | null>;
}

/**
 * Um só lugar resolve "de quem é essa mensagem" pra qualquer canal — WhatsApp,
 * Instagram, Messenger, Telegram, e-mail, e o que vier depois (pedido do
 * usuário, 22/09: mesma classe, mesmo método em todo o sistema, nunca
 * duplicado por canal). Trava a identidade, acha ou cria o lead, abre ou
 * reaproveita a conversa, e delega só o insert da mensagem em si pro
 * chamador — que é a única parte que realmente varia de canal pra canal.
 */
@Injectable()
export class InboundMessageIngestor {
  private readonly db: SparkDb = createAppDbClient();
  constructor(private readonly events: DomainEventWriter) {}

  async ingest(orgId: OrgId, params: InboundIngestParams): Promise<boolean> {
    return withOrgContext(this.db, orgId, async (tx) => {
      const externalValue = normalizeIdentityValue(params.channel, params.senderId);
      // The identity and conversation are shared state; serialize concurrent deliveries per sender.
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`${orgId}:${params.channel}:${externalValue}`}, 0))`);
      const [duplicate] = await tx.select({ id: messages.id }).from(messages).where(and(eq(messages.orgId, orgId), eq(messages.externalId, params.externalId))).limit(1);
      if (duplicate) return false;

      const [identity] = await tx.select({ contactId: identities.contactId }).from(identities).where(and(eq(identities.orgId, orgId), eq(identities.channel, params.channel), eq(identities.externalValue, externalValue))).limit(1);
      const leadId = (identity?.contactId ?? contactId.create()) as ContactId;
      if (!identity) {
        await tx.insert(contacts).values({ id: leadId, orgId, name: params.contactName, ...(params.setContactPhone ? { phone: externalValue } : {}), ...(params.setContactEmail ? { email: externalValue } : {}), source: params.channel });
        await tx.insert(identities).values({ id: identityId.create(), orgId, contactId: leadId, channel: params.channel, externalValue });
        await this.events.append(tx, { orgId, contactId: leadId, type: "contact.created", data: { source: params.channel } });
      }

      const [existing] = await tx.select({ id: conversations.id }).from(conversations).where(and(eq(conversations.orgId, orgId), eq(conversations.contactId, leadId), eq(conversations.channel, params.channel), inArray(conversations.status, ["open", "snoozed"]))).orderBy(desc(conversations.lastMessageAt)).limit(1);
      const threadId = (existing?.id ?? conversationId.create()) as ConversationId;
      if (!existing) {
        await tx.insert(conversations).values({ id: threadId, orgId, contactId: leadId, channel: params.channel, subject: params.conversationSubject, firstResponseDueAt: new Date(firstResponseDueAt(params.occurredAt, "normal")), lastMessageAt: params.occurredAt, createdAt: params.occurredAt });
        await this.events.append(tx, { orgId, contactId: leadId, type: "conversation.created", data: { conversationId: threadId, channel: params.channel } });
      } else {
        await tx.update(conversations).set({ status: "open", snoozedUntil: null, lastMessageAt: params.occurredAt, updatedAt: new Date() }).where(eq(conversations.id, threadId));
      }

      const insertedId = await params.insertMessage(tx, leadId, threadId);
      if (!insertedId) return false;
      await this.events.append(tx, { orgId, contactId: leadId, type: "message.received", data: { conversationId: threadId, messageId: insertedId, channel: params.channel } });
      return true;
    });
  }
}
