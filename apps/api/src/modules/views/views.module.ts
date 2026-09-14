import { Module } from "@nestjs/common";
import { CapabilityGuard, SupabaseJwtGuard } from "../../auth/index.js";
import { GetCurrentUserUseCase } from "../identity/application/get-current-user.usecase.js";
import { PermissionGroupsRepository } from "../identity/infrastructure/permission-groups.repository.js";
import { UsersRepository } from "../identity/infrastructure/users.repository.js";
import { SavedViewsRepository } from "./infrastructure/saved-views.repository.js";
import { SavedViewsController } from "./presentation/saved-views.controller.js";

@Module({
  controllers: [SavedViewsController],
  providers: [SavedViewsRepository, GetCurrentUserUseCase, UsersRepository, PermissionGroupsRepository, SupabaseJwtGuard, CapabilityGuard],
})
export class ViewsModule {}
