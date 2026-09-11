import { Module } from "@nestjs/common";
import { CapabilityGuard, SupabaseJwtGuard } from "../../auth/index.js";
import { EventsModule } from "../events/events.module.js";
import { GetCurrentUserUseCase } from "../identity/application/get-current-user.usecase.js";
import { PermissionGroupsRepository } from "../identity/infrastructure/permission-groups.repository.js";
import { UsersRepository } from "../identity/infrastructure/users.repository.js";
import { CreateAutomationUseCase } from "./application/create-automation.usecase.js";
import { PublishAutomationUseCase } from "./application/publish-automation.usecase.js";
import { UpdateAutomationDraftUseCase } from "./application/update-automation-draft.usecase.js";
import { UpdateAutomationStatusUseCase } from "./application/update-automation-status.usecase.js";
import { AutomationsRepository } from "./infrastructure/automations.repository.js";
import { AutomationsController } from "./presentation/automations.controller.js";

@Module({ imports: [EventsModule], controllers: [AutomationsController], providers: [CreateAutomationUseCase, UpdateAutomationDraftUseCase, UpdateAutomationStatusUseCase, PublishAutomationUseCase, AutomationsRepository, GetCurrentUserUseCase, UsersRepository, PermissionGroupsRepository, SupabaseJwtGuard, CapabilityGuard] })
export class AutomationsModule {}
