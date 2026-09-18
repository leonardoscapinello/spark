import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { CurrentSupabaseUser, SupabaseJwtGuard, type SupabaseJwtClaims } from "../../../auth/index.js";
import { GetCurrentUserUseCase } from "../../identity/application/get-current-user.usecase.js";
import { ResolveCompanyRegistrationUseCase } from "../application/resolve-company-registration.usecase.js";
import { ResolveCompanyRegistrationDto, ResolveCompanyRegistrationResponseDto } from "../dto/company-registration.dto.js";

@ApiTags("company-registrations")
@ApiBearerAuth()
@UseGuards(SupabaseJwtGuard)
@Controller("v1/company-registrations")
export class CompanyRegistrationsController {
  constructor(
    private readonly currentUser: GetCurrentUserUseCase,
    private readonly resolveRegistration: ResolveCompanyRegistrationUseCase,
  ) {}

  /**
   * A ida à Receita acontece AQUI, no servidor, nunca na tela: leitura de tela
   * lê coleção local (CLAUDE.md, regra 5). A tela pede uma vez, a resposta vai
   * para o banco, e daí em diante todas as telas leem sincronizado.
   */
  @Post("resolve")
  @ApiOkResponse({ type: ResolveCompanyRegistrationResponseDto })
  async resolve(
    @CurrentSupabaseUser() claims: SupabaseJwtClaims,
    @Body() body: ResolveCompanyRegistrationDto,
  ): Promise<ResolveCompanyRegistrationResponseDto> {
    const user = await this.currentUser.execute(claims.sub);
    return this.resolveRegistration.execute(user.orgId, body.taxId, body.refresh) as Promise<ResolveCompanyRegistrationResponseDto>;
  }
}
