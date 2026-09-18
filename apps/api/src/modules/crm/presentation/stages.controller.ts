import { Body, Controller, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { pipelineId as pipelineIdFactory, stageId as stageIdFactory } from "@spark/core";
import { SupabaseJwtGuard, CapabilityGuard, RequireCapability, CurrentSupabaseUser, type SupabaseJwtClaims } from "../../../auth/index.js";
import { GetCurrentUserUseCase } from "../../identity/application/get-current-user.usecase.js";
import { CreateStageUseCase } from "../application/create-stage.usecase.js";
import { RenameStageUseCase } from "../application/rename-stage.usecase.js";
import { ConfigureStageUseCase } from "../application/configure-stage.usecase.js";
import { ArchiveStageUseCase } from "../application/archive-stage.usecase.js";
import { ReorderStagesUseCase } from "../application/reorder-stages.usecase.js";
import { ArchiveStageDto, ArchiveStageResponseDto, ConfigureStageDto, ConfigureStageResponseDto, CreateStageDto, CreateStageResponseDto, RenameStageDto, RenameStageResponseDto, ReorderStagesDto, ReorderStagesResponseDto } from "../dto/stage.dto.js";

@ApiTags("crm")
@Controller("v1/stages")
export class StagesController {
  constructor(
    private readonly getCurrentUser: GetCurrentUserUseCase,
    private readonly createStage: CreateStageUseCase,
    private readonly renameStage: RenameStageUseCase,
    private readonly configureStage: ConfigureStageUseCase,
    private readonly archiveStage: ArchiveStageUseCase,
    private readonly reorderStages: ReorderStagesUseCase,
  ) {}

  @Post()
  @UseGuards(SupabaseJwtGuard, CapabilityGuard)
  @RequireCapability("pipelines:manage")
  @ApiBearerAuth()
  @ApiCreatedResponse({ type: CreateStageResponseDto })
  async create(
    @CurrentSupabaseUser() claims: SupabaseJwtClaims,
    @Body() body: CreateStageDto,
  ): Promise<CreateStageResponseDto> {
    const user = await this.getCurrentUser.execute(claims.sub);
    const result = await this.createStage.execute(user.orgId, body);
    return result as CreateStageResponseDto;
  }

  @Patch(":id/rename")
  @UseGuards(SupabaseJwtGuard, CapabilityGuard)
  @RequireCapability("pipelines:manage")
  @ApiBearerAuth()
  @ApiOkResponse({ type: RenameStageResponseDto })
  async rename(
    @CurrentSupabaseUser() claims: SupabaseJwtClaims,
    @Param("id") id: string,
    @Body() body: RenameStageDto,
  ): Promise<RenameStageResponseDto> {
    const user = await this.getCurrentUser.execute(claims.sub);
    const result = await this.renameStage.execute(user.orgId, stageIdFactory.from(id), body.name);
    return result as RenameStageResponseDto;
  }

  @Patch(":id/archive")
  @UseGuards(SupabaseJwtGuard, CapabilityGuard)
  @RequireCapability("pipelines:manage")
  @ApiBearerAuth()
  @ApiOkResponse({ type: ArchiveStageResponseDto })
  async archive(
    @CurrentSupabaseUser() claims: SupabaseJwtClaims,
    @Param("id") id: string,
    @Body() body: ArchiveStageDto,
  ): Promise<ArchiveStageResponseDto> {
    const user = await this.getCurrentUser.execute(claims.sub);
    const result = await this.archiveStage.execute(user.orgId, stageIdFactory.from(id), body.archived);
    return result as ArchiveStageResponseDto;
  }

  /**
   * Reordena todo o funil de uma vez — nunca etapa por etapa. Arrastar uma
   * etapa da posição 2 para a 5 desloca toda etapa entre elas, e mandar isso
   * como N chamadas separadas deixaria o quadro com posição inconsistente se
   * alguma falhasse no meio.
   */
  @Post("reorder")
  @UseGuards(SupabaseJwtGuard, CapabilityGuard)
  @RequireCapability("pipelines:manage")
  @ApiBearerAuth()
  @ApiOkResponse({ type: ReorderStagesResponseDto })
  async reorder(
    @CurrentSupabaseUser() claims: SupabaseJwtClaims,
    @Body() body: ReorderStagesDto,
  ): Promise<ReorderStagesResponseDto> {
    const user = await this.getCurrentUser.execute(claims.sub);
    const result = await this.reorderStages.execute(user.orgId, pipelineIdFactory.from(body.pipelineId), body.orderedIds.map((id) => stageIdFactory.from(id)));
    return result as ReorderStagesResponseDto;
  }

  @Patch(":id/configure")
  @UseGuards(SupabaseJwtGuard, CapabilityGuard)
  @RequireCapability("pipelines:manage")
  @ApiBearerAuth()
  @ApiOkResponse({ type: ConfigureStageResponseDto })
  async configure(@CurrentSupabaseUser() claims: SupabaseJwtClaims, @Param("id") id: string, @Body() body: ConfigureStageDto): Promise<ConfigureStageResponseDto> {
    const user = await this.getCurrentUser.execute(claims.sub);
    return this.configureStage.execute(user.orgId, stageIdFactory.from(id), body) as Promise<ConfigureStageResponseDto>;
  }
}
