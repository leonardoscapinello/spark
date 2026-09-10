import { Module } from "@nestjs/common";
import { DevLoginController } from "./presentation/dev-login.controller.js";
import { PermissionGroupsRepository } from "../identity/infrastructure/permission-groups.repository.js";

// ConfigModule NÃO é importado aqui — já é global via AppModule (ver o
// mesmo comentário em identity.module.ts). Reimportar sem forRoot() por
// cima do global é o que já causou ConfigService undefined uma vez.
@Module({
  controllers: [DevLoginController],
  providers: [PermissionGroupsRepository],
})
export class DevModule {}
