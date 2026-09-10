import { Module } from "@nestjs/common";
import { ShapesController } from "./presentation/shapes.controller.js";
import { GetCurrentUserUseCase } from "../identity/application/get-current-user.usecase.js";
import { UsersRepository } from "../identity/infrastructure/users.repository.js";
import { SupabaseJwtGuard } from "../../auth/index.js";

@Module({
  controllers: [ShapesController],
  providers: [GetCurrentUserUseCase, UsersRepository, SupabaseJwtGuard],
})
export class SyncModule {}
