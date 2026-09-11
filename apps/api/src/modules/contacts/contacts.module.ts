import { Module } from "@nestjs/common";
import { ContactsController } from "./presentation/contacts.controller.js";
import { CreateContactUseCase } from "./application/create-contact.usecase.js";
import { UpdateContactUseCase } from "./application/update-contact.usecase.js";
import { ArchiveContactUseCase } from "./application/archive-contact.usecase.js";
import { ContactsRepository } from "./infrastructure/contacts.repository.js";
import { GetCurrentUserUseCase } from "../identity/application/get-current-user.usecase.js";
import { UsersRepository } from "../identity/infrastructure/users.repository.js";
import { PermissionGroupsRepository } from "../identity/infrastructure/permission-groups.repository.js";
import { SupabaseJwtGuard, CapabilityGuard } from "../../auth/index.js";
import { EventsModule } from "../events/events.module.js";

@Module({
  imports: [EventsModule],
  controllers: [ContactsController],
  providers: [
    CreateContactUseCase,
    UpdateContactUseCase,
    ArchiveContactUseCase,
    ContactsRepository,
    GetCurrentUserUseCase,
    UsersRepository,
    PermissionGroupsRepository,
    SupabaseJwtGuard,
    CapabilityGuard,
  ],
})
export class ContactsModule {}
