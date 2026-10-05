import { Module } from "@nestjs/common";
import { CapabilityGuard, SupabaseJwtGuard } from "../../auth/index.js";
import { SettingsModule } from "../settings/settings.module.js";
import { EventsModule } from "../events/events.module.js";
import { GetCurrentUserUseCase } from "../identity/application/get-current-user.usecase.js";
import { PermissionGroupsRepository } from "../identity/infrastructure/permission-groups.repository.js";
import { UsersRepository } from "../identity/infrastructure/users.repository.js";
import { CatalogService } from "./application/catalog.service.js";
import { CatalogRepository } from "./infrastructure/catalog.repository.js";
import { CatalogController } from "./presentation/catalog.controller.js";
import { CommercialTermsController } from "./presentation/commercial-terms.controller.js";
import { CommercialTermsRepository } from "./infrastructure/commercial-terms.repository.js";
@Module({ imports: [EventsModule, SettingsModule], controllers: [CatalogController, CommercialTermsController], providers: [CatalogService, CatalogRepository, CommercialTermsRepository, GetCurrentUserUseCase, UsersRepository, PermissionGroupsRepository, SupabaseJwtGuard, CapabilityGuard] }) export class CatalogModule {}
