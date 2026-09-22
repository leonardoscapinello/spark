import { Injectable, NotFoundException } from "@nestjs/common";
import { and, desc, eq, inArray } from "drizzle-orm";
import { conversations, createAppDbClient, identities, integrationConnections, messages, widgetPublicKeys, withOrgContext, type SparkDb } from "@spark/db";
import { normalizeIdentityValue, type ContactId, type ConversationId, type IntegrationConnectionId, type OrgId, type SendWidgetMessageInput, type StartWidgetConversationInput, type WidgetConfig, type WidgetConversationState, type WidgetMessage } from "@spark/core";
import { ConnectionSettingsRepository } from "../../integrations/infrastructure/connection-settings.repository.js";
import { InboundMessageIngestor } from "./inbound-message-ingestor.service.js";

/**
 * Único caminho de leitura/escrita do chat embutido — sem sessão, sem
 * organização conhecida de antemão: o publicKey (gerado, não adivinhável)
 * é quem resolve pra qual org/conexão a mensagem vai, via
 * `widget_public_keys` (sem RLS de propósito, igual `lead_form_public_keys`).
 * Escrita reaproveita o mesmo `InboundMessageIngestor` de todo canal.
 */
@Injectable()
export class WidgetRepository {
  private readonly db: SparkDb = createAppDbClient();
  constructor(private readonly settings: ConnectionSettingsRepository, private readonly ingestor: InboundMessageIngestor) {}

  async config(publicKey: string): Promise<WidgetConfig> {
    const { orgId, connectionId } = await this.resolve(publicKey);
    return withOrgContext(this.db, orgId, async (tx) => {
      const [connection] = await tx.select().from(integrationConnections).where(and(eq(integrationConnections.id, connectionId), eq(integrationConnections.orgId, orgId), eq(integrationConnections.status, "connected"))).limit(1);
      if (!connection) throw new NotFoundException("Widget indisponível.");
      const config = await this.settings.read(tx, connectionId);
      const color = text(config.color);
      return {
        publicKey,
        name: text(config.name) || connection.name,
        welcomeMessage: text(config.welcomeMessage) || "Olá! Como podemos ajudar?",
        color: /^#[0-9a-fA-F]{6}$/.test(color) ? color : "#4338CA",
        position: config.position === "left" ? "left" : "right",
      };
    });
  }

  async start(publicKey: string, input: StartWidgetConversationInput): Promise<WidgetConversationState> {
    const { orgId, connectionId } = await this.resolve(publicKey);
    await this.ingestor.ingest(orgId, {
      channel: "widget",
      connectionId,
      externalId: input.message.id,
      senderId: input.visitorId,
      contactName: input.name?.trim() || "Visitante do site",
      conversationSubject: "Chat do site",
      occurredAt: new Date(),
      insertMessage: (tx, leadId, threadId) => insertInbound(tx, orgId, leadId, threadId, input.message.id, input.message.body),
    });
    return this.state(publicKey, input.visitorId);
  }

  async send(publicKey: string, input: SendWidgetMessageInput): Promise<WidgetConversationState> {
    const { orgId, connectionId } = await this.resolve(publicKey);
    await this.ingestor.ingest(orgId, {
      channel: "widget",
      connectionId,
      externalId: input.id,
      senderId: input.visitorId,
      contactName: "Visitante do site",
      conversationSubject: "Chat do site",
      occurredAt: new Date(),
      insertMessage: (tx, leadId, threadId) => insertInbound(tx, orgId, leadId, threadId, input.id, input.body),
    });
    return this.state(publicKey, input.visitorId);
  }

  async state(publicKey: string, visitorId: string): Promise<WidgetConversationState> {
    const { orgId, connectionId } = await this.resolve(publicKey);
    return withOrgContext(this.db, orgId, async (tx) => {
      const externalValue = normalizeIdentityValue("widget", visitorId);
      const [identity] = await tx.select({ contactId: identities.contactId }).from(identities).where(and(eq(identities.orgId, orgId), eq(identities.channel, "widget"), eq(identities.externalValue, externalValue))).limit(1);
      if (!identity) throw new NotFoundException("Conversa não encontrada.");
      const [conversation] = await tx.select({ id: conversations.id }).from(conversations).where(and(eq(conversations.orgId, orgId), eq(conversations.contactId, identity.contactId), eq(conversations.channel, "widget"), eq(conversations.connectionId, connectionId))).orderBy(desc(conversations.lastMessageAt)).limit(1);
      if (!conversation) throw new NotFoundException("Conversa não encontrada.");
      const rows = await tx.select().from(messages).where(and(eq(messages.orgId, orgId), eq(messages.conversationId, conversation.id), inArray(messages.direction, ["inbound", "outbound"]))).orderBy(messages.createdAt);
      const list: WidgetMessage[] = rows.map((row) => ({ id: row.id as WidgetMessage["id"], direction: row.direction as WidgetMessage["direction"], body: row.body, createdAt: row.createdAt.toISOString() }));
      return { conversationId: conversation.id as ConversationId, messages: list };
    });
  }

  private async resolve(publicKey: string): Promise<{ orgId: OrgId; connectionId: IntegrationConnectionId }> {
    // Bootstrap público: nenhuma org conhecida ainda, por isso a tabela sem RLS — o publicKey em si é o controle de acesso.
    const [row] = await this.db.select().from(widgetPublicKeys).where(eq(widgetPublicKeys.publicKey, publicKey)).limit(1);
    if (!row) throw new NotFoundException("Widget indisponível.");
    return { orgId: row.orgId as OrgId, connectionId: row.connectionId as IntegrationConnectionId };
  }
}

async function insertInbound(tx: SparkDb, orgId: OrgId, leadId: ContactId, threadId: ConversationId, id: string, body: string): Promise<string | null> {
  const [message] = await tx.insert(messages).values({ id, orgId, conversationId: threadId, contactId: leadId, direction: "inbound", status: "received", body, externalId: id, createdAt: new Date() }).onConflictDoNothing().returning({ id: messages.id });
  return message?.id ?? null;
}

function text(value: unknown): string { return typeof value === "string" ? value : ""; }
