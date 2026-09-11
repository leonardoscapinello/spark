import { Body, Controller, Get, NotFoundException, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { teamId as teamIdFactory } from "@spark/core";
import { CapabilityGuard, CurrentSupabaseUser, RequireCapability, SupabaseJwtGuard, type SupabaseJwtClaims } from "../../../auth/index.js";
import { GetCurrentUserUseCase } from "../application/get-current-user.usecase.js";
import { CreateTeamDto, ReplaceTeamMembersDto, SetTeamArchivedDto, TeamDto, UpdateTeamDto } from "../dto/user.dto.js";
import { TeamsRepository } from "../infrastructure/teams.repository.js";

@ApiTags("identity")
@Controller("v1/admin/teams")
@UseGuards(SupabaseJwtGuard, CapabilityGuard)
@RequireCapability("users:manage")
@ApiBearerAuth()
export class TeamsController {
  constructor(private readonly currentUser: GetCurrentUserUseCase, private readonly teams: TeamsRepository) {}

  @Get()
  @ApiOkResponse({ type: TeamDto, isArray: true })
  async list(@CurrentSupabaseUser() claims: SupabaseJwtClaims): Promise<TeamDto[]> {
    const actor = await this.currentUser.execute(claims.sub);
    return await this.teams.list(actor.orgId) as TeamDto[];
  }

  @Post()
  @ApiCreatedResponse({ type: TeamDto })
  async create(@CurrentSupabaseUser() claims: SupabaseJwtClaims, @Body() body: CreateTeamDto): Promise<TeamDto> {
    const actor = await this.currentUser.execute(claims.sub);
    return await this.teams.create(actor.orgId, actor.id, body) as TeamDto;
  }

  @Patch(":id")
  @ApiOkResponse({ type: TeamDto })
  async update(@CurrentSupabaseUser() claims: SupabaseJwtClaims, @Param("id") id: string, @Body() body: UpdateTeamDto): Promise<TeamDto> {
    const actor = await this.currentUser.execute(claims.sub);
    const team = await this.teams.update(actor.orgId, actor.id, teamIdFactory.from(id), body);
    if (!team) throw new NotFoundException("Team not found in this organization.");
    return team as TeamDto;
  }

  @Patch(":id/members")
  @ApiOkResponse({ type: TeamDto })
  async members(@CurrentSupabaseUser() claims: SupabaseJwtClaims, @Param("id") id: string, @Body() body: ReplaceTeamMembersDto): Promise<TeamDto> {
    const actor = await this.currentUser.execute(claims.sub);
    const team = await this.teams.replaceMembers(actor.orgId, actor.id, teamIdFactory.from(id), body.memberIds);
    if (!team) throw new NotFoundException("Team not found in this organization.");
    return team as TeamDto;
  }

  @Patch(":id/archive")
  @ApiOkResponse({ type: TeamDto })
  async archive(@CurrentSupabaseUser() claims: SupabaseJwtClaims, @Param("id") id: string, @Body() body: SetTeamArchivedDto): Promise<TeamDto> {
    const actor = await this.currentUser.execute(claims.sub);
    const team = await this.teams.setArchived(actor.orgId, actor.id, teamIdFactory.from(id), body.archived);
    if (!team) throw new NotFoundException("Team not found in this organization.");
    return team as TeamDto;
  }
}
