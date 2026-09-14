import { Module } from "@nestjs/common";
import { SupabaseJwtGuard } from "../../auth/index.js";
import { GetCurrentUserUseCase } from "../identity/application/get-current-user.usecase.js";
import { UsersRepository } from "../identity/infrastructure/users.repository.js";
import { UserPreferencesRepository } from "./infrastructure/user-preferences.repository.js";
import { UserPreferencesController } from "./presentation/user-preferences.controller.js";

@Module({
  controllers: [UserPreferencesController],
  providers: [UserPreferencesRepository, GetCurrentUserUseCase, UsersRepository, SupabaseJwtGuard],
})
export class PreferencesModule {}
