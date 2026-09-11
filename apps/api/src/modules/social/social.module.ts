import { Module } from "@nestjs/common";
import { CapabilityGuard, SupabaseJwtGuard } from "../../auth/index.js";
import { EventsModule } from "../events/events.module.js";
import { GetCurrentUserUseCase } from "../identity/application/get-current-user.usecase.js";
import { PermissionGroupsRepository } from "../identity/infrastructure/permission-groups.repository.js";
import { UsersRepository } from "../identity/infrastructure/users.repository.js";
import { IntegrationsModule } from "../integrations/integrations.module.js";
import { SocialService } from "./application/social.service.js";
import { BufferSocialAdapter } from "./infrastructure/buffer-social.adapter.js";
import { SocialRepository } from "./infrastructure/social.repository.js";
import { SocialController } from "./presentation/social.controller.js";
@Module({
  imports: [EventsModule, IntegrationsModule],
  controllers: [SocialController],
  providers: [
    SocialService,
    SocialRepository,
    BufferSocialAdapter,
    GetCurrentUserUseCase,
    UsersRepository,
    PermissionGroupsRepository,
    SupabaseJwtGuard,
    CapabilityGuard,
  ],
})
export class SocialModule {}
