import { Body, Controller, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { stageId as stageIdFactory } from "@spark/core";
import { SupabaseJwtGuard, CapabilityGuard, RequireCapability, CurrentSupabaseUser, type SupabaseJwtClaims } from "../../../auth/index.js";
import { GetCurrentUserUseCase } from "../../identity/application/get-current-user.usecase.js";
import { CreateStageUseCase } from "../application/create-stage.usecase.js";
import { RenameStageUseCase } from "../application/rename-stage.usecase.js";
import { ConfigureStageUseCase } from "../application/configure-stage.usecase.js";
import { ConfigureStageDto, ConfigureStageResponseDto, CreateStageDto, CreateStageResponseDto, RenameStageDto, RenameStageResponseDto } from "../dto/stage.dto.js";

@ApiTags("crm")
@Controller("v1/stages")
export class StagesController {
  constructor(
    private readonly getCurrentUser: GetCurrentUserUseCase,
    private readonly createStage: CreateStageUseCase,
    private readonly renameStage: RenameStageUseCase,
    private readonly configureStage: ConfigureStageUseCase,
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
