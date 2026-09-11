import { Module } from "@nestjs/common";
import { CapabilityGuard, SupabaseJwtGuard } from "../../auth/index.js";
import { EventsModule } from "../events/events.module.js";
import { GetCurrentUserUseCase } from "../identity/application/get-current-user.usecase.js";
import { PermissionGroupsRepository } from "../identity/infrastructure/permission-groups.repository.js";
import { UsersRepository } from "../identity/infrastructure/users.repository.js";
import { CheckIntegrationUseCase } from "./application/check-integration.usecase.js";
import { UpdateIntegrationStatusUseCase } from "./application/update-integration-status.usecase.js";
import { UpsertIntegrationUseCase } from "./application/upsert-integration.usecase.js";
import { IntegrationsRepository } from "./infrastructure/integrations.repository.js";
import { IntegrationProviderRegistry } from "./infrastructure/provider-registry.service.js";
import { SecretVault } from "./infrastructure/secret-vault.service.js";
import { IntegrationsController } from "./presentation/integrations.controller.js";
@Module({ imports: [EventsModule], controllers: [IntegrationsController], providers: [UpsertIntegrationUseCase, CheckIntegrationUseCase, UpdateIntegrationStatusUseCase, IntegrationsRepository, IntegrationProviderRegistry, SecretVault, GetCurrentUserUseCase, UsersRepository, PermissionGroupsRepository, SupabaseJwtGuard, CapabilityGuard], exports: [SecretVault] })
export class IntegrationsModule {}
