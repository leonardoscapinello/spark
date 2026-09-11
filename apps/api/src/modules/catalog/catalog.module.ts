import { Module } from "@nestjs/common";
import { CapabilityGuard, SupabaseJwtGuard } from "../../auth/index.js";
import { EventsModule } from "../events/events.module.js";
import { GetCurrentUserUseCase } from "../identity/application/get-current-user.usecase.js";
import { PermissionGroupsRepository } from "../identity/infrastructure/permission-groups.repository.js";
import { UsersRepository } from "../identity/infrastructure/users.repository.js";
import { CatalogService } from "./application/catalog.service.js";
import { CatalogRepository } from "./infrastructure/catalog.repository.js";
import { CatalogController } from "./presentation/catalog.controller.js";
@Module({ imports: [EventsModule], controllers: [CatalogController], providers: [CatalogService, CatalogRepository, GetCurrentUserUseCase, UsersRepository, PermissionGroupsRepository, SupabaseJwtGuard, CapabilityGuard] }) export class CatalogModule {}
