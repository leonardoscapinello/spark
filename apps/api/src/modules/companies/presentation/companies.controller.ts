import { Body, Controller, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { companyId } from "@spark/core";
import { CapabilityGuard, CurrentSupabaseUser, RequireCapability, SupabaseJwtGuard, type SupabaseJwtClaims } from "../../../auth/index.js";
import { GetCurrentUserUseCase } from "../../identity/application/get-current-user.usecase.js";
import { ArchiveCompanyUseCase } from "../application/archive-company.usecase.js";
import { CreateCompanyUseCase } from "../application/create-company.usecase.js";
import { UpdateCompanyUseCase } from "../application/update-company.usecase.js";
import { CompanyWriteResponseDto, CreateCompanyDto, UpdateCompanyArchiveDto, UpdateCompanyDto } from "../dto/company.dto.js";

@ApiTags("companies")
@ApiBearerAuth()
@UseGuards(SupabaseJwtGuard, CapabilityGuard)
@Controller("v1/companies")
export class CompaniesController {
  constructor(
    private readonly getCurrentUser: GetCurrentUserUseCase,
    private readonly createCompany: CreateCompanyUseCase,
    private readonly updateCompany: UpdateCompanyUseCase,
    private readonly archiveCompany: ArchiveCompanyUseCase,
  ) {}

  @Post()
  @RequireCapability("companies:write")
  @ApiCreatedResponse({ type: CompanyWriteResponseDto })
  async create(@CurrentSupabaseUser() claims: SupabaseJwtClaims, @Body() body: CreateCompanyDto): Promise<CompanyWriteResponseDto> {
    const user = await this.getCurrentUser.execute(claims.sub);
    return this.createCompany.execute(user.orgId, body) as Promise<CompanyWriteResponseDto>;
  }

  @Patch(":id")
  @RequireCapability("companies:write")
  @ApiOkResponse({ type: CompanyWriteResponseDto })
  async update(@CurrentSupabaseUser() claims: SupabaseJwtClaims, @Param("id") id: string, @Body() body: UpdateCompanyDto): Promise<CompanyWriteResponseDto> {
    const user = await this.getCurrentUser.execute(claims.sub);
    return this.updateCompany.execute(user.orgId, companyId.from(id), body) as Promise<CompanyWriteResponseDto>;
  }

  @Patch(":id/archive")
  @RequireCapability("companies:write")
  @ApiOkResponse({ type: CompanyWriteResponseDto })
  async archive(@CurrentSupabaseUser() claims: SupabaseJwtClaims, @Param("id") id: string, @Body() body: UpdateCompanyArchiveDto): Promise<CompanyWriteResponseDto> {
    const user = await this.getCurrentUser.execute(claims.sub);
    return this.archiveCompany.execute(user.orgId, companyId.from(id), body.archived) as Promise<CompanyWriteResponseDto>;
  }
}
