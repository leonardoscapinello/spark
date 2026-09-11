import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { CapabilityGuard, CurrentSupabaseUser, RequireCapability, SupabaseJwtGuard, type SupabaseJwtClaims } from "../../../auth/index.js";
import { GetCurrentUserUseCase } from "../application/get-current-user.usecase.js";
import { InviteUserUseCase } from "../application/invite-user.usecase.js";
import { UsersRepository } from "../infrastructure/users.repository.js";
import { AdminUserDto, InviteUserDto } from "../dto/user.dto.js";
import { ReplaceUserPermissionGroupDto, UpdateUserAccessDto } from "../dto/user.dto.js";
import { permissionGroupId as permissionGroupIdFactory, userId as userIdFactory } from "@spark/core";
import { UpdateUserAccessUseCase } from "../application/update-user-access.usecase.js";

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
    private readonly updateUserAccess: UpdateUserAccessUseCase,
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

  @Patch(":id/access")
  @ApiOkResponse({ type: AdminUserDto })
  async access(@CurrentSupabaseUser() claims: SupabaseJwtClaims, @Param("id") id: string, @Body() body: UpdateUserAccessDto): Promise<AdminUserDto> {
    const actor = await this.currentUser.execute(claims.sub);
    return await this.updateUserAccess.execute(actor.orgId, actor.id, userIdFactory.from(id), body.active) as AdminUserDto;
  }

  @Patch(":id/permission-group")
  @ApiOkResponse({ type: AdminUserDto })
  async permissionGroup(@CurrentSupabaseUser() claims: SupabaseJwtClaims, @Param("id") id: string, @Body() body: ReplaceUserPermissionGroupDto): Promise<AdminUserDto> {
    const actor = await this.currentUser.execute(claims.sub);
    const targetUserId = userIdFactory.from(id);
    if (actor.id === targetUserId) throw new BadRequestException("You cannot change your own permission group.");
    const updated = await this.users.replacePermissionGroup(actor.orgId, actor.id, targetUserId, permissionGroupIdFactory.from(body.groupId));
    if (!updated) throw new NotFoundException("User or permission group not found in this organization.");
    return updated as AdminUserDto;
  }
}
