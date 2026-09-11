import { Module } from "@nestjs/common";
import { CapabilityGuard, SupabaseJwtGuard } from "../../auth/index.js";
import { EventsModule } from "../events/events.module.js";
import { GetCurrentUserUseCase } from "../identity/application/get-current-user.usecase.js";
import { PermissionGroupsRepository } from "../identity/infrastructure/permission-groups.repository.js";
import { UsersRepository } from "../identity/infrastructure/users.repository.js";
import { FormsService } from "./application/forms.service.js";
import { FormsRepository } from "./infrastructure/forms.repository.js";
import { FormsController, PublicFormsController } from "./presentation/forms.controller.js";
@Module({ imports: [EventsModule], controllers: [FormsController, PublicFormsController], providers: [FormsService, FormsRepository, GetCurrentUserUseCase, UsersRepository, PermissionGroupsRepository, SupabaseJwtGuard, CapabilityGuard] }) export class FormsModule {}
