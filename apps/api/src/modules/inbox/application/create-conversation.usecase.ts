import { Injectable } from "@nestjs/common";
import type { ConversationWriteResponse, CreateConversationInput, OrgId, UserId } from "@spark/core";
import { InboxRepository } from "../infrastructure/inbox.repository.js";

@Injectable()
export class CreateConversationUseCase {
  constructor(private readonly inbox: InboxRepository) {}
  execute(orgId: OrgId, actorUserId: UserId, input: CreateConversationInput): Promise<ConversationWriteResponse> {
    return this.inbox.createConversation(orgId, actorUserId, input);
  }
}
