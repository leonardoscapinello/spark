import { Body, Controller, Delete, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { stageFieldRuleId as stageFieldRuleIdFactory } from "@spark/core";
import { CapabilityGuard, CurrentSupabaseUser, RequireCapability, SupabaseJwtGuard, type SupabaseJwtClaims } from "../../../auth/index.js";
import { GetCurrentUserUseCase } from "../../identity/application/get-current-user.usecase.js";
import { CreateStageFieldRuleDto, StageFieldRuleWriteResponseDto } from "../dto/stage-field-rule.dto.js";
import { StageFieldRulesRepository } from "../infrastructure/stage-field-rules.repository.js";

/** Configurar o que cada etapa exige é administrar o funil, não mexer num negócio. */
@ApiTags("crm")
@ApiBearerAuth()
@UseGuards(SupabaseJwtGuard, CapabilityGuard)
@RequireCapability("pipelines:manage")
@Controller("v1/stage-field-rules")
export class StageFieldRulesController {
  constructor(
    private readonly getCurrentUser: GetCurrentUserUseCase,
    private readonly rules: StageFieldRulesRepository,
  ) {}

  @Post()
  @ApiCreatedResponse({ type: StageFieldRuleWriteResponseDto })
  async save(@CurrentSupabaseUser() claims: SupabaseJwtClaims, @Body() body: CreateStageFieldRuleDto) {
    const user = await this.getCurrentUser.execute(claims.sub);
    return this.rules.save(user.orgId, body) as Promise<StageFieldRuleWriteResponseDto>;
  }

  @Delete(":id")
  @ApiOkResponse({ type: StageFieldRuleWriteResponseDto })
  async remove(@CurrentSupabaseUser() claims: SupabaseJwtClaims, @Param("id") id: string) {
    const user = await this.getCurrentUser.execute(claims.sub);
    return this.rules.remove(user.orgId, stageFieldRuleIdFactory.from(id)) as Promise<StageFieldRuleWriteResponseDto>;
  }
}
