import { Body, Controller, Get, NotFoundException, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { permissionGroupId as permissionGroupIdFactory } from "@spark/core";
import { CapabilityGuard, CurrentSupabaseUser, RequireCapability, SupabaseJwtGuard, type SupabaseJwtClaims } from "../../../auth/index.js";
import { GetCurrentUserUseCase } from "../application/get-current-user.usecase.js";
import { PermissionGroupsRepository } from "../infrastructure/permission-groups.repository.js";
import { AssignUserToPermissionGroupDto, CreatePermissionGroupDto, PermissionGroupDto, UpdatePermissionGroupDto } from "../dto/user.dto.js";

/** Administration surface. Every route names permission_groups:manage so
 * adding an admin action cannot silently become available to all users. */
@ApiTags("identity")
@Controller("v1/admin/permission-groups")
@UseGuards(SupabaseJwtGuard, CapabilityGuard)
@RequireCapability("permission_groups:manage")
@ApiBearerAuth()
export class PermissionGroupsController {
  constructor(private readonly currentUser: GetCurrentUserUseCase, private readonly groups: PermissionGroupsRepository) {}

  @Get()
  @ApiOkResponse({ type: PermissionGroupDto, isArray: true })
  async list(@CurrentSupabaseUser() claims: SupabaseJwtClaims): Promise<PermissionGroupDto[]> {
    const user = await this.currentUser.execute(claims.sub);
    return await this.groups.list(user.orgId) as PermissionGroupDto[];
  }

  @Post()
  @ApiCreatedResponse({ type: PermissionGroupDto })
  async create(@CurrentSupabaseUser() claims: SupabaseJwtClaims, @Body() body: CreatePermissionGroupDto): Promise<PermissionGroupDto> {
    const user = await this.currentUser.execute(claims.sub);
    return await this.groups.create(user.orgId, user.id, body) as PermissionGroupDto;
  }

  @Patch(":id")
  @ApiOkResponse({ type: PermissionGroupDto })
  async update(@CurrentSupabaseUser() claims: SupabaseJwtClaims, @Param("id") id: string, @Body() body: UpdatePermissionGroupDto): Promise<PermissionGroupDto> {
    const user = await this.currentUser.execute(claims.sub);
    const group = await this.groups.update(user.orgId, user.id, permissionGroupIdFactory.from(id), body);
    if (!group) throw new NotFoundException(`Permission group ${id} not found.`);
    return group as PermissionGroupDto;
  }

  @Post(":id/users")
  async assignUser(@CurrentSupabaseUser() claims: SupabaseJwtClaims, @Param("id") id: string, @Body() body: AssignUserToPermissionGroupDto): Promise<void> {
    const user = await this.currentUser.execute(claims.sub);
    const assigned = await this.groups.assignUser(user.orgId, user.id, body.userId, permissionGroupIdFactory.from(id));
    if (!assigned) throw new NotFoundException("User or permission group not found in this organization.");
  }
}
