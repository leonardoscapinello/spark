import { Injectable } from "@nestjs/common";
import type { AddInternalNoteInput, ConversationId, MessageWriteResponse, OrgId, UserId } from "@spark/core";
import { InboxRepository } from "../infrastructure/inbox.repository.js";

@Injectable()
export class AddInternalNoteUseCase {
  constructor(private readonly inbox: InboxRepository) {}
  execute(orgId: OrgId, actorUserId: UserId, conversationId: ConversationId, input: AddInternalNoteInput): Promise<MessageWriteResponse> {
    return this.inbox.addInternalNote(orgId, actorUserId, conversationId, input);
  }
}
