import { Body, Controller, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { stageId as stageIdFactory } from "@spark/core";
import { SupabaseJwtGuard, CapabilityGuard, RequireCapability, CurrentSupabaseUser, type SupabaseJwtClaims } from "../../../auth/index.js";
import { GetCurrentUserUseCase } from "../../identity/application/get-current-user.usecase.js";
import { CreateStageUseCase } from "../application/create-stage.usecase.js";
import { RenameStageUseCase } from "../application/rename-stage.usecase.js";
import { CreateStageDto, CreateStageResponseDto, RenameStageDto, RenameStageResponseDto } from "../dto/stage.dto.js";

@ApiTags("crm")
@Controller("v1/stages")
export class StagesController {
  constructor(
    private readonly getCurrentUser: GetCurrentUserUseCase,
    private readonly createStage: CreateStageUseCase,
    private readonly renameStage: RenameStageUseCase,
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
    const usuario = await this.getCurrentUser.execute(claims.sub);
    const resultado = await this.createStage.execute(usuario.orgId, body);
    return resultado as CreateStageResponseDto;
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
    const usuario = await this.getCurrentUser.execute(claims.sub);
    const resultado = await this.renameStage.execute(usuario.orgId, stageIdFactory.de(id), body.nome);
    return resultado as RenameStageResponseDto;
  }
}
