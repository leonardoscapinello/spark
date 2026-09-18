import { Module } from "@nestjs/common";
import { SupabaseJwtGuard } from "../../auth/index.js";
import { GetCurrentUserUseCase } from "../identity/application/get-current-user.usecase.js";
import { UsersRepository } from "../identity/infrastructure/users.repository.js";
import { ResolveCompanyRegistrationUseCase } from "./application/resolve-company-registration.usecase.js";
import { CompanyRegistrationsRepository } from "./infrastructure/company-registrations.repository.js";
import { ReceitaFetcher } from "./infrastructure/receita-fetcher.js";
import { CompanyRegistrationsController } from "./presentation/company-registrations.controller.js";

@Module({
  controllers: [CompanyRegistrationsController],
  providers: [ResolveCompanyRegistrationUseCase, ReceitaFetcher, CompanyRegistrationsRepository, GetCurrentUserUseCase, UsersRepository, SupabaseJwtGuard],
})
export class CompanyRegistrationsModule {}
