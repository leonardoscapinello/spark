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

@Module({
  imports: [EventsModule],
  controllers: [InboxController],
  providers: [CreateConversationUseCase, UpdateConversationUseCase, AddInternalNoteUseCase, InboxRepository, GetCurrentUserUseCase, UsersRepository, PermissionGroupsRepository, SupabaseJwtGuard, CapabilityGuard],
})
export class InboxModule {}
