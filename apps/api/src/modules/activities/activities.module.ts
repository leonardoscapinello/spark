import { Module } from "@nestjs/common";
import { ActivitiesController } from "./presentation/activities.controller.js";
import { CreateActivityUseCase } from "./application/create-activity.usecase.js";
import { CompleteActivityUseCase } from "./application/complete-activity.usecase.js";
import { ActivitiesRepository } from "./infrastructure/activities.repository.js";
import { GetCurrentUserUseCase } from "../identity/application/get-current-user.usecase.js";
import { UsersRepository } from "../identity/infrastructure/users.repository.js";
import { PermissionGroupsRepository } from "../identity/infrastructure/permission-groups.repository.js";
import { SupabaseJwtGuard, CapabilityGuard } from "../../auth/index.js";
import { EventsModule } from "../events/events.module.js";

@Module({
  imports: [EventsModule],
  controllers: [ActivitiesController],
  providers: [
    CreateActivityUseCase,
    CompleteActivityUseCase,
    ActivitiesRepository,
    GetCurrentUserUseCase,
    UsersRepository,
    PermissionGroupsRepository,
    SupabaseJwtGuard,
    CapabilityGuard,
  ],
})
export class ActivitiesModule {}
