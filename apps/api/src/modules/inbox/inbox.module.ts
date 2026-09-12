import { Module } from "@nestjs/common";
import { CapabilityGuard, SupabaseJwtGuard } from "../../auth/index.js";
import { EventsModule } from "../events/events.module.js";
import { GetCurrentUserUseCase } from "../identity/application/get-current-user.usecase.js";
import { PermissionGroupsRepository } from "../identity/infrastructure/permission-groups.repository.js";
import { UsersRepository } from "../identity/infrastructure/users.repository.js";
import { AddInternalNoteUseCase } from "./application/add-internal-note.usecase.js";
import { CreateConversationUseCase } from "./application/create-conversation.usecase.js";
import { UpdateConversationUseCase } from "./application/update-conversation.usecase.js";
import { InboxRepository } from "./infrastructure/inbox.repository.js";
import { InboxController } from "./presentation/inbox.controller.js";
import { IntegrationsModule } from "../integrations/integrations.module.js";
import { SendMessageUseCase } from "./application/send-message.usecase.js";
import { ChannelSender } from "./infrastructure/channel-sender.service.js";
import { OutboundMessagesRepository } from "./infrastructure/outbound-messages.repository.js";
import { CannedRepliesRepository } from "./infrastructure/canned-replies.repository.js";
import { InstagramWebhookRepository } from "./infrastructure/instagram-webhook.repository.js";
import { InstagramWebhookController } from "./presentation/instagram-webhook.controller.js";

@Module({
  imports: [EventsModule, IntegrationsModule],
  controllers: [InboxController, InstagramWebhookController],
  providers: [CreateConversationUseCase, UpdateConversationUseCase, AddInternalNoteUseCase, SendMessageUseCase, InboxRepository, OutboundMessagesRepository, CannedRepliesRepository, InstagramWebhookRepository, ChannelSender, GetCurrentUserUseCase, UsersRepository, PermissionGroupsRepository, SupabaseJwtGuard, CapabilityGuard],
})
export class InboxModule {}
