import { Module } from "@nestjs/common";
import { MeController } from "./presentation/me.controller.js";
import { GetCurrentUserUseCase } from "./application/get-current-user.usecase.js";
import { UsersRepository } from "./infrastructure/users.repository.js";
import { PermissionGroupsRepository } from "./infrastructure/permission-groups.repository.js";
import { SupabaseJwtGuard } from "../../auth/index.js";

// ConfigModule is deliberately NOT imported here — it's already global via
// ConfigModule.forRoot({ isGlobal: true }) in AppModule. Reimporting the
// version without forRoot() on top is what left ConfigService undefined
// inside SupabaseJwtGuard (docs/adr/0003 — a single module, no duplicating
// infrastructure config per domain module).
@Module({
  controllers: [MeController],
  providers: [GetCurrentUserUseCase, UsersRepository, PermissionGroupsRepository, SupabaseJwtGuard],
})
export class IdentityModule {}
