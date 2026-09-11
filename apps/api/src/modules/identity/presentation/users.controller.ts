import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { CapabilityGuard, CurrentSupabaseUser, RequireCapability, SupabaseJwtGuard, type SupabaseJwtClaims } from "../../../auth/index.js";
import { GetCurrentUserUseCase } from "../application/get-current-user.usecase.js";
import { InviteUserUseCase } from "../application/invite-user.usecase.js";
import { UsersRepository } from "../infrastructure/users.repository.js";
import { AdminUserDto, InviteUserDto } from "../dto/user.dto.js";

@ApiTags("identity")
@Controller("v1/admin/users")
@UseGuards(SupabaseJwtGuard, CapabilityGuard)
@RequireCapability("users:manage")
@ApiBearerAuth()
export class UsersController {
  constructor(
    private readonly currentUser: GetCurrentUserUseCase,
    private readonly users: UsersRepository,
    private readonly inviteUser: InviteUserUseCase,
  ) {}

  @Get()
  @ApiOkResponse({ type: AdminUserDto, isArray: true })
  async list(@CurrentSupabaseUser() claims: SupabaseJwtClaims): Promise<AdminUserDto[]> {
    const actor = await this.currentUser.execute(claims.sub);
    return await this.users.listByOrg(actor.orgId) as AdminUserDto[];
  }

  @Post("invite")
  @ApiCreatedResponse({ type: AdminUserDto })
  async invite(@CurrentSupabaseUser() claims: SupabaseJwtClaims, @Body() body: InviteUserDto): Promise<AdminUserDto> {
    const actor = await this.currentUser.execute(claims.sub);
    return await this.inviteUser.execute(actor.orgId, actor.id, body) as AdminUserDto;
  }
}
