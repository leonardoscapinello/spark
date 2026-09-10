import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiCreatedResponse, ApiTags } from "@nestjs/swagger";
import { SupabaseJwtGuard, CapabilityGuard, RequireCapability, CurrentSupabaseUser, type SupabaseJwtClaims } from "../../../auth/index.js";
import { GetCurrentUserUseCase } from "../../identity/application/get-current-user.usecase.js";
import { CreateStageUseCase } from "../application/create-stage.usecase.js";
import { CreateStageDto, CreateStageResponseDto } from "../dto/stage.dto.js";

@ApiTags("crm")
@Controller("v1/stages")
export class StagesController {
  constructor(
    private readonly getCurrentUser: GetCurrentUserUseCase,
    private readonly createStage: CreateStageUseCase,
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
}
