import { Module } from "@nestjs/common";
import { CapabilityGuard, SupabaseJwtGuard } from "../../auth/index.js";
import { GetCurrentUserUseCase } from "../identity/application/get-current-user.usecase.js";
import { PermissionGroupsRepository } from "../identity/infrastructure/permission-groups.repository.js";
import { UsersRepository } from "../identity/infrastructure/users.repository.js";
import { ArchiveCompanyUseCase } from "./application/archive-company.usecase.js";
import { CreateCompanyUseCase } from "./application/create-company.usecase.js";
import { UpdateCompanyUseCase } from "./application/update-company.usecase.js";
import { CompaniesRepository } from "./infrastructure/companies.repository.js";
import { CompaniesController } from "./presentation/companies.controller.js";

@Module({
  controllers: [CompaniesController],
  providers: [CreateCompanyUseCase, UpdateCompanyUseCase, ArchiveCompanyUseCase, CompaniesRepository, GetCurrentUserUseCase, UsersRepository, PermissionGroupsRepository, SupabaseJwtGuard, CapabilityGuard],
})
export class CompaniesModule {}
