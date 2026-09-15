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
import { ConnectionSettingsRepository } from "./infrastructure/connection-settings.repository.js";
import { IntegrationProviderRegistry } from "./infrastructure/provider-registry.service.js";
import { SecretVault } from "./infrastructure/secret-vault.service.js";
import { IntegrationsController } from "./presentation/integrations.controller.js";
import { IntegrationRuntimeResolver } from "./application/integration-runtime-resolver.service.js";
import { EmailDeliveryService } from "./application/email-delivery.service.js";
import { CalendarFeedSyncService } from "./application/calendar-feed-sync.service.js";
@Module({
  imports: [EventsModule],
  controllers: [IntegrationsController],
  providers: [
    UpsertIntegrationUseCase,
    CheckIntegrationUseCase,
    UpdateIntegrationStatusUseCase,
    IntegrationsRepository,
    ConnectionSettingsRepository,
    IntegrationProviderRegistry,
    SecretVault,
    IntegrationRuntimeResolver,
    EmailDeliveryService,
    CalendarFeedSyncService,
    GetCurrentUserUseCase,
    UsersRepository,
    PermissionGroupsRepository,
    SupabaseJwtGuard,
    CapabilityGuard,
  ],
  exports: [SecretVault, ConnectionSettingsRepository, IntegrationRuntimeResolver, EmailDeliveryService],
})
export class IntegrationsModule {}
