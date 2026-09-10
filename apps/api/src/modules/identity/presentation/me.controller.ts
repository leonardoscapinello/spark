import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { SupabaseJwtGuard, CurrentSupabaseUser, type SupabaseJwtClaims } from "../../../auth/index.js";
import { GetCurrentUserUseCase } from "../application/get-current-user.usecase.js";
import { UserDto } from "../dto/user.dto.js";

@ApiTags("identity")
@Controller("v1")
export class MeController {
  constructor(private readonly getCurrentUser: GetCurrentUserUseCase) {}

  @Get("me")
  @UseGuards(SupabaseJwtGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ type: UserDto })
  async me(@CurrentSupabaseUser() claims: SupabaseJwtClaims): Promise<UserDto> {
    const user = await this.getCurrentUser.execute(claims.sub);
    return user as UserDto;
  }
}
