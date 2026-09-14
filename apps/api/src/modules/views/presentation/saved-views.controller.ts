import { Body, Controller, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { effectiveCapabilities, savedViewId } from "@spark/core";
import { CapabilityGuard, CurrentSupabaseUser, RequireCapability, SupabaseJwtGuard, type SupabaseJwtClaims } from "../../../auth/index.js";
import { GetCurrentUserUseCase } from "../../identity/application/get-current-user.usecase.js";
import { PermissionGroupsRepository } from "../../identity/infrastructure/permission-groups.repository.js";
import { ArchiveSavedViewDto, CreateSavedViewDto, SavedViewWriteResponseDto } from "../dto/saved-view.dto.js";
import { SavedViewsRepository } from "../infrastructure/saved-views.repository.js";

@ApiTags("views")
@ApiBearerAuth()
@UseGuards(SupabaseJwtGuard, CapabilityGuard)
@RequireCapability("contacts:read")
@Controller("v1/saved-views")
export class SavedViewsController {
  constructor(
    private readonly currentUser: GetCurrentUserUseCase,
    private readonly permissionGroups: PermissionGroupsRepository,
    private readonly views: SavedViewsRepository,
  ) {}

  @Post()
  @ApiCreatedResponse({ type: SavedViewWriteResponseDto })
  async create(@CurrentSupabaseUser() claims: SupabaseJwtClaims, @Body() body: CreateSavedViewDto) {
    const user = await this.currentUser.execute(claims.sub);
    return this.views.create(user.orgId, user.id, body);
  }

  @Patch(":id/archive")
  @ApiOkResponse({ type: SavedViewWriteResponseDto })
  async archive(@CurrentSupabaseUser() claims: SupabaseJwtClaims, @Param("id") id: string, @Body() body: ArchiveSavedViewDto) {
    const user = await this.currentUser.execute(claims.sub);
    const groups = await this.permissionGroups.getUserCapabilities(user.id);
    const canManageOthers = effectiveCapabilities(groups).includes("contacts:write");
    return this.views.archive(user.orgId, savedViewId.from(id), body.archived, user.id, canManageOthers);
  }
}
