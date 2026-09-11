import { Module } from "@nestjs/common";
import { CapabilityGuard, SupabaseJwtGuard } from "../../auth/index.js";
import { EventsModule } from "../events/events.module.js"; import { IntegrationsModule } from "../integrations/integrations.module.js";
import { GetCurrentUserUseCase } from "../identity/application/get-current-user.usecase.js"; import { PermissionGroupsRepository } from "../identity/infrastructure/permission-groups.repository.js"; import { UsersRepository } from "../identity/infrastructure/users.repository.js";
import { CampaignsService } from "./application/campaigns.service.js"; import { CampaignsRepository } from "./infrastructure/campaigns.repository.js"; import { CampaignsController } from "./presentation/campaigns.controller.js";
@Module({ imports: [EventsModule, IntegrationsModule], controllers: [CampaignsController], providers: [CampaignsService, CampaignsRepository, GetCurrentUserUseCase, UsersRepository, PermissionGroupsRepository, SupabaseJwtGuard, CapabilityGuard] }) export class CampaignsModule {}
