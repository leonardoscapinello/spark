import { Injectable, NotFoundException } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import { withOrgContext, createAppDbClient, integrationConnections, integrationSecrets, messages, type SparkDb } from "@spark/db";
import { messageId, parsePostmarkInboundEmail, type IntegrationConnectionId, type OrgId } from "@spark/core";
import { SecretVault } from "../../integrations/infrastructure/secret-vault.service.js";
import { InboundMessageIngestor } from "./inbound-message-ingestor.service.js";

@Injectable()
export class PostmarkWebhookRepository {
  private readonly db: SparkDb = createAppDbClient();
  constructor(private readonly vault: SecretVault, private readonly ingestor: InboundMessageIngestor) {}

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
    const added = await this.ingestor.ingest(orgId, {
      channel: "email",
      externalId: item.externalId,
      senderId: item.senderId,
      contactName: item.senderName ?? item.senderId,
      setContactEmail: true,
      conversationSubject: item.subject,
      occurredAt: item.occurredAt,
      insertMessage: async (tx, leadId, threadId) => {
        const [message] = await tx.insert(messages).values({ id: messageId.create(), orgId, conversationId: threadId, contactId: leadId, direction: "inbound", status: "received", body: item.text, externalId: item.externalId, createdAt: item.occurredAt }).onConflictDoNothing().returning({ id: messages.id });
        return message?.id ?? null;
      },
    });
    return added ? 1 : 0;
  }
}
