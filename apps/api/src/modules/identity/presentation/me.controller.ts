import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiExtraModels, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { effectiveCapabilities, type CurrentUser } from "@spark/core";
import { SupabaseJwtGuard, CurrentSupabaseUser, type SupabaseJwtClaims } from "../../../auth/index.js";
import { GetCurrentUserUseCase } from "../application/get-current-user.usecase.js";
import { PermissionGroupsRepository } from "../infrastructure/permission-groups.repository.js";
import { CurrentUserDto, UserDto } from "../dto/user.dto.js";

@ApiTags("identity")
@ApiExtraModels(UserDto)
@Controller("v1")
export class MeController {
  constructor(
    private readonly getCurrentUser: GetCurrentUserUseCase,
    private readonly permissionGroups: PermissionGroupsRepository,
  ) {}

  @Get("me")
  @UseGuards(SupabaseJwtGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ type: CurrentUserDto })
  async me(@CurrentSupabaseUser() claims: SupabaseJwtClaims): Promise<CurrentUserDto> {
    const user = await this.getCurrentUser.execute(claims.sub);
    const groups = await this.permissionGroups.getUserCapabilities(user.id);
    return { ...user, capabilities: effectiveCapabilities(groups) } as CurrentUser;
  }
}
