import { Injectable } from "@nestjs/common";
import type { ConversationId, ConversationWriteResponse, OrgId, UpdateConversationInput, UserId } from "@spark/core";
import { InboxRepository } from "../infrastructure/inbox.repository.js";

@Injectable()
export class UpdateConversationUseCase {
  constructor(private readonly inbox: InboxRepository) {}
  execute(orgId: OrgId, actorUserId: UserId, id: ConversationId, input: UpdateConversationInput): Promise<ConversationWriteResponse> {
    return this.inbox.updateConversation(orgId, actorUserId, id, input);
  }
}
