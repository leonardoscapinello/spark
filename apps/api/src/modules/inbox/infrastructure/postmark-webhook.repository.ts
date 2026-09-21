import { Injectable, NotFoundException } from "@nestjs/common";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { contacts, conversations, createAppDbClient, identities, integrationConnections, integrationSecrets, messages, withOrgContext, type SparkDb } from "@spark/db";
import { contactId, conversationId, firstResponseDueAt, identityId, messageId, normalizeIdentityValue, parsePostmarkInboundEmail, type IntegrationConnectionId, type OrgId } from "@spark/core";
import { DomainEventWriter } from "../../events/application/domain-event-writer.js";
import { SecretVault } from "../../integrations/infrastructure/secret-vault.service.js";

@Injectable()
export class PostmarkWebhookRepository {
  private readonly db: SparkDb = createAppDbClient();
  constructor(private readonly vault: SecretVault, private readonly events: DomainEventWriter) {}

  async connection(id: IntegrationConnectionId): Promise<{ orgId: OrgId; username: string; password: string }> {
    // Public webhook bootstrap: resolve only the tenant and provider before entering org context.
    const [route] = await this.db.select({ orgId: integrationConnections.orgId, provider: integrationConnections.provider, status: integrationConnections.status }).from(integrationConnections).where(eq(integrationConnections.id, id)).limit(1);
    if (!route || route.provider !== "postmark" || route.status === "disabled") throw new NotFoundException("Webhook indisponível.");
    const orgId = route.orgId as OrgId;
    const [stored] = await withOrgContext(this.db, orgId, (tx) => tx.select().from(integrationSecrets).where(and(eq(integrationSecrets.orgId, orgId), eq(integrationSecrets.connectionId, id))).limit(1));
    if (!stored) throw new NotFoundException("Webhook não configurado.");
    const secrets = this.vault.decrypt(stored);
    if (!secrets.username || !secrets.password) throw new NotFoundException("Webhook não configurado.");
    return { orgId, username: secrets.username, password: secrets.password };
  }

  async receive(orgId: OrgId, payload: unknown): Promise<number> {
    const item = parsePostmarkInboundEmail(payload);
    if (!item) return 0;
    const added = await withOrgContext(this.db, orgId, async (tx) => {
      const externalValue = normalizeIdentityValue("email", item.senderId);
      // The identity and conversation are shared state; serialize concurrent deliveries per sender.
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`${orgId}:email:${externalValue}`}, 0))`);
      const [duplicate] = await tx.select({ id: messages.id }).from(messages).where(and(eq(messages.orgId, orgId), eq(messages.externalId, item.externalId))).limit(1);
      if (duplicate) return false;
      const [identity] = await tx.select({ contactId: identities.contactId }).from(identities).where(and(eq(identities.orgId, orgId), eq(identities.channel, "email"), eq(identities.externalValue, externalValue))).limit(1);
      const leadId = identity?.contactId ?? contactId.create();
      if (!identity) {
        await tx.insert(contacts).values({ id: leadId, orgId, name: item.senderName ?? externalValue, email: externalValue, source: "email" });
        await tx.insert(identities).values({ id: identityId.create(), orgId, contactId: leadId, channel: "email", externalValue });
        await this.events.append(tx, { orgId, contactId: leadId as ReturnType<typeof contactId.create>, type: "contact.created", data: { source: "email" } });
      }
      const [existing] = await tx.select({ id: conversations.id }).from(conversations).where(and(eq(conversations.orgId, orgId), eq(conversations.contactId, leadId), eq(conversations.channel, "email"), inArray(conversations.status, ["open", "snoozed"]))).orderBy(desc(conversations.lastMessageAt)).limit(1);
      const threadId = existing?.id ?? conversationId.create();
      if (!existing) {
        await tx.insert(conversations).values({ id: threadId, orgId, contactId: leadId, channel: "email", subject: item.subject, firstResponseDueAt: new Date(firstResponseDueAt(item.occurredAt, "normal")), lastMessageAt: item.occurredAt, createdAt: item.occurredAt });
        await this.events.append(tx, { orgId, contactId: leadId as ReturnType<typeof contactId.create>, type: "conversation.created", data: { conversationId: threadId, channel: "email" } });
      } else {
        await tx.update(conversations).set({ status: "open", snoozedUntil: null, lastMessageAt: item.occurredAt, updatedAt: new Date() }).where(eq(conversations.id, threadId));
      }
      const [message] = await tx.insert(messages).values({ id: messageId.create(), orgId, conversationId: threadId, contactId: leadId, direction: "inbound", status: "received", body: item.text, externalId: item.externalId, createdAt: item.occurredAt }).onConflictDoNothing().returning({ id: messages.id });
      if (!message) return false;
      await this.events.append(tx, { orgId, contactId: leadId as ReturnType<typeof contactId.create>, type: "message.received", data: { conversationId: threadId, messageId: message.id, channel: "email" } });
      return true;
    });
    return added ? 1 : 0;
  }
}
