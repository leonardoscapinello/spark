import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiCreatedResponse, ApiTags } from "@nestjs/swagger";
import { SupabaseJwtGuard, CapabilityGuard, RequireCapability, CurrentSupabaseUser, type SupabaseJwtClaims } from "../../../auth/index.js";
import { GetCurrentUserUseCase } from "../../identity/application/get-current-user.usecase.js";
import { CreatePipelineUseCase } from "../application/create-pipeline.usecase.js";
import { CreatePipelineDto, CreatePipelineResponseDto } from "../dto/pipeline.dto.js";

@ApiTags("crm")
@Controller("v1/pipelines")
export class PipelinesController {
  constructor(
    private readonly getCurrentUser: GetCurrentUserUseCase,
    private readonly createPipeline: CreatePipelineUseCase,
  ) {}

  @Post()
  @UseGuards(SupabaseJwtGuard, CapabilityGuard)
  @RequireCapability("pipelines:manage")
  @ApiBearerAuth()
  @ApiCreatedResponse({ type: CreatePipelineResponseDto })
  async create(
    @CurrentSupabaseUser() claims: SupabaseJwtClaims,
    @Body() body: CreatePipelineDto,
  ): Promise<CreatePipelineResponseDto> {
    const usuario = await this.getCurrentUser.execute(claims.sub);
    const resultado = await this.createPipeline.execute(usuario.orgId, body);
    return resultado as CreatePipelineResponseDto;
  }
}
