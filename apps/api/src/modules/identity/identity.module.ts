import { Module } from "@nestjs/common";
import { MeController } from "./presentation/me.controller.js";
import { GetCurrentUserUseCase } from "./application/get-current-user.usecase.js";
import { UsersRepository } from "./infrastructure/users.repository.js";
import { PermissionGroupsRepository } from "./infrastructure/permission-groups.repository.js";
import { SupabaseJwtGuard } from "../../auth/index.js";
import { CapabilityGuard } from "../../auth/index.js";
import { PermissionGroupsController } from "./presentation/permission-groups.controller.js";
import { UsersController } from "./presentation/users.controller.js";
import { InviteUserUseCase } from "./application/invite-user.usecase.js";
import { IDENTITY_ADMIN_GATEWAY } from "./application/identity-admin.gateway.js";
import { SupabaseIdentityAdminGateway } from "./infrastructure/supabase-identity-admin.gateway.js";
import { UpdateUserAccessUseCase } from "./application/update-user-access.usecase.js";
import { AuditLogsController } from "./presentation/audit-logs.controller.js";
import { AuditLogsRepository } from "./infrastructure/audit-logs.repository.js";
import { TeamsController } from "./presentation/teams.controller.js";
import { TeamsRepository } from "./infrastructure/teams.repository.js";
import { EmailVerificationModule } from "../email-verification/email-verification.module.js";

// ConfigModule is deliberately NOT imported here — it's already global via
// ConfigModule.forRoot({ isGlobal: true }) in AppModule. Reimporting the
// version without forRoot() on top is what left ConfigService undefined
// inside SupabaseJwtGuard (docs/adr/0003 — a single module, no duplicating
// infrastructure config per domain module).
@Module({
  imports: [EmailVerificationModule],
  controllers: [
    MeController,
    PermissionGroupsController,
    UsersController,
    TeamsController,
    AuditLogsController,
  ],
  providers: [
    GetCurrentUserUseCase,
    InviteUserUseCase,
    UpdateUserAccessUseCase,
    AuditLogsRepository,
    UsersRepository,
    PermissionGroupsRepository,
    TeamsRepository,
    SupabaseJwtGuard,
    CapabilityGuard,
    SupabaseIdentityAdminGateway,
    { provide: IDENTITY_ADMIN_GATEWAY, useExisting: SupabaseIdentityAdminGateway },
  ],
})
export class IdentityModule {}
