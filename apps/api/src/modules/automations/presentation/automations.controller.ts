import { Body, Controller, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { automationId } from "@spark/core";
import { CapabilityGuard, CurrentSupabaseUser, RequireCapability, SupabaseJwtGuard, type SupabaseJwtClaims } from "../../../auth/index.js";
import { GetCurrentUserUseCase } from "../../identity/application/get-current-user.usecase.js";
import { CreateAutomationUseCase } from "../application/create-automation.usecase.js";
import { PublishAutomationUseCase } from "../application/publish-automation.usecase.js";
import { UpdateAutomationDraftUseCase } from "../application/update-automation-draft.usecase.js";
import { UpdateAutomationStatusUseCase } from "../application/update-automation-status.usecase.js";
import { AutomationPublishResponseDto, AutomationWriteResponseDto, CreateAutomationDto, PublishAutomationDto, UpdateAutomationDraftDto, UpdateAutomationStatusDto } from "../dto/automations.dto.js";

@ApiTags("automations")
@ApiBearerAuth()
@UseGuards(SupabaseJwtGuard, CapabilityGuard)
@Controller("v1/automations")
export class AutomationsController {
  constructor(private readonly currentUser: GetCurrentUserUseCase, private readonly createAutomation: CreateAutomationUseCase, private readonly updateDraft: UpdateAutomationDraftUseCase, private readonly updateStatus: UpdateAutomationStatusUseCase, private readonly publishAutomation: PublishAutomationUseCase) {}
  @Post() @RequireCapability("automations:write") @ApiCreatedResponse({ type: AutomationWriteResponseDto })
  async create(@CurrentSupabaseUser() claims: SupabaseJwtClaims, @Body() body: CreateAutomationDto): Promise<AutomationWriteResponseDto> { const user = await this.currentUser.execute(claims.sub); return this.createAutomation.execute(user.orgId, user.id, body) as Promise<AutomationWriteResponseDto>; }
  @Patch(":id/draft") @RequireCapability("automations:write") @ApiOkResponse({ type: AutomationWriteResponseDto })
  async draft(@CurrentSupabaseUser() claims: SupabaseJwtClaims, @Param("id") id: string, @Body() body: UpdateAutomationDraftDto): Promise<AutomationWriteResponseDto> { const user = await this.currentUser.execute(claims.sub); return this.updateDraft.execute(user.orgId, user.id, automationId.from(id), body) as Promise<AutomationWriteResponseDto>; }
  @Patch(":id/status") @RequireCapability("automations:write") @ApiOkResponse({ type: AutomationWriteResponseDto })
  async status(@CurrentSupabaseUser() claims: SupabaseJwtClaims, @Param("id") id: string, @Body() body: UpdateAutomationStatusDto): Promise<AutomationWriteResponseDto> { const user = await this.currentUser.execute(claims.sub); return this.updateStatus.execute(user.orgId, user.id, automationId.from(id), body) as Promise<AutomationWriteResponseDto>; }
  @Post(":id/publish") @RequireCapability("automations:publish") @ApiCreatedResponse({ type: AutomationPublishResponseDto })
  async publish(@CurrentSupabaseUser() claims: SupabaseJwtClaims, @Param("id") id: string, @Body() body: PublishAutomationDto): Promise<AutomationPublishResponseDto> { const user = await this.currentUser.execute(claims.sub); return this.publishAutomation.execute(user.orgId, user.id, automationId.from(id), body) as Promise<AutomationPublishResponseDto>; }
}
