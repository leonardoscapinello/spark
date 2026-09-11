import { Module } from "@nestjs/common";
import { DevLoginController } from "./presentation/dev-login.controller.js";
import { PermissionGroupsRepository } from "../identity/infrastructure/permission-groups.repository.js";

// ConfigModule is NOT imported here — already global via AppModule (see
// the same comment in identity.module.ts). Reimporting without forRoot()
// on top of the global one already caused ConfigService to be undefined once.
@Module({
  controllers: [DevLoginController],
  providers: [PermissionGroupsRepository],
})
export class DevModule {}
