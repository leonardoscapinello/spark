import { Module } from "@nestjs/common";
import { CapabilityGuard, SupabaseJwtGuard } from "../../auth/index.js";
import { IntegrationsModule } from "../integrations/integrations.module.js";
import { GetCurrentUserUseCase } from "../identity/application/get-current-user.usecase.js";
import { PermissionGroupsRepository } from "../identity/infrastructure/permission-groups.repository.js";
import { UsersRepository } from "../identity/infrastructure/users.repository.js";
import { EmailVerificationService } from "./application/email-verification.service.js";
import { EmailVerificationsController } from "./presentation/email-verifications.controller.js";

@Module({
  imports: [IntegrationsModule],
  controllers: [EmailVerificationsController],
  providers: [
    EmailVerificationService,
    GetCurrentUserUseCase,
    UsersRepository,
    PermissionGroupsRepository,
    SupabaseJwtGuard,
    CapabilityGuard,
  ],
  exports: [EmailVerificationService],
})
export class EmailVerificationModule {}
