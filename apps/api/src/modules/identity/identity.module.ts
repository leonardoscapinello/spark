import { Module } from "@nestjs/common";
import { MeController } from "./presentation/me.controller.js";
import { GetCurrentUserUseCase } from "./application/get-current-user.usecase.js";
import { UsersRepository } from "./infrastructure/users.repository.js";
import { PermissionGroupsRepository } from "./infrastructure/permission-groups.repository.js";
import { SupabaseJwtGuard } from "../../auth/index.js";

// ConfigModule NÃO é importado aqui de propósito — já é global via
// ConfigModule.forRoot({ isGlobal: true }) no AppModule. Reimportar a
// versão sem forRoot() por cima é o que deixava ConfigService undefined
// dentro de SupabaseJwtGuard (docs/adr/0003 — um módulo só, sem duplicar
// configuração de infraestrutura por módulo de domínio).
@Module({
  controllers: [MeController],
  providers: [GetCurrentUserUseCase, UsersRepository, PermissionGroupsRepository, SupabaseJwtGuard],
})
export class IdentityModule {}
