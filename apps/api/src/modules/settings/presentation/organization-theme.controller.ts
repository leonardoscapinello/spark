import { Body, Controller, Patch, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { CapabilityGuard, CurrentSupabaseUser, RequireCapability, SupabaseJwtGuard, type SupabaseJwtClaims } from "../../../auth/index.js";
import { GetCurrentUserUseCase } from "../../identity/application/get-current-user.usecase.js";
import { OrganizationThemeWriteResponseDto, UpdateOrganizationThemeDto } from "../dto/settings.dto.js";
import { OrganizationThemeRepository } from "../infrastructure/organization-theme.repository.js";

@ApiTags("settings")
@ApiBearerAuth()
@UseGuards(SupabaseJwtGuard, CapabilityGuard)
@RequireCapability("settings:manage")
@Controller("v1/settings/organization-theme")
export class OrganizationThemeController {
  constructor(private readonly currentUser: GetCurrentUserUseCase, private readonly themes: OrganizationThemeRepository) {}

  @Patch()
  @ApiOkResponse({ type: OrganizationThemeWriteResponseDto })
  async update(@CurrentSupabaseUser() claims: SupabaseJwtClaims, @Body() body: UpdateOrganizationThemeDto) {
    const user = await this.currentUser.execute(claims.sub);
    return this.themes.update(user.orgId, body);
  }
}

