import { Injectable } from "@nestjs/common";
import type { ConversationId, MessageWriteResponse, OrgId, SendMessageInput, UserId } from "@spark/core";
import { OutboundMessagesRepository } from "../infrastructure/outbound-messages.repository.js";
@Injectable() export class SendMessageUseCase { constructor(private readonly messages: OutboundMessagesRepository) {} execute(orgId: OrgId, userId: UserId, conversationId: ConversationId, input: SendMessageInput): Promise<MessageWriteResponse> { return this.messages.send(orgId, userId, conversationId, input); } }
