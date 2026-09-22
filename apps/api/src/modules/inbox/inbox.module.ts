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
import { WhatsAppWebhookRepository } from "./infrastructure/whatsapp-webhook.repository.js";
import { WhatsAppWebhookController } from "./presentation/whatsapp-webhook.controller.js";
import { MessengerWebhookRepository } from "./infrastructure/messenger-webhook.repository.js";
import { MessengerWebhookController } from "./presentation/messenger-webhook.controller.js";
import { TelegramWebhookRepository } from "./infrastructure/telegram-webhook.repository.js";
import { TelegramWebhookController } from "./presentation/telegram-webhook.controller.js";
import { PostmarkWebhookRepository } from "./infrastructure/postmark-webhook.repository.js";
import { PostmarkWebhookController } from "./presentation/postmark-webhook.controller.js";
import { InboundMediaStorage } from "./infrastructure/inbound-media-storage.service.js";
import { InboundMessageIngestor } from "./infrastructure/inbound-message-ingestor.service.js";
import { WebhookQueue } from "./infrastructure/webhook-queue.service.js";
import { WhatsAppTemplatesRepository } from "./infrastructure/whatsapp-templates.repository.js";
import { WhatsAppTemplatesController } from "./presentation/whatsapp-templates.controller.js";
import { ListWhatsAppTemplatesUseCase } from "./application/list-whatsapp-templates.usecase.js";
import { SyncWhatsAppTemplatesUseCase } from "./application/sync-whatsapp-templates.usecase.js";
import { FilesModule } from "../files/files.module.js";

@Module({
  imports: [EventsModule, IntegrationsModule, FilesModule],
  controllers: [InboxController, InstagramWebhookController, WhatsAppWebhookController, MessengerWebhookController, TelegramWebhookController, PostmarkWebhookController, WhatsAppTemplatesController],
  providers: [CreateConversationUseCase, UpdateConversationUseCase, AddInternalNoteUseCase, SendMessageUseCase, InboxRepository, OutboundMessagesRepository, CannedRepliesRepository, InstagramWebhookRepository, WhatsAppWebhookRepository, MessengerWebhookRepository, TelegramWebhookRepository, PostmarkWebhookRepository, InboundMediaStorage, InboundMessageIngestor, WebhookQueue, WhatsAppTemplatesRepository, ListWhatsAppTemplatesUseCase, SyncWhatsAppTemplatesUseCase, ChannelSender, GetCurrentUserUseCase, UsersRepository, PermissionGroupsRepository, SupabaseJwtGuard, CapabilityGuard],
})
export class InboxModule {}
