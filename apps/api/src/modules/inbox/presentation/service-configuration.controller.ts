import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { createZodDto } from "nestjs-zod";
import { SaveServiceConfigurationSchema, SaveServiceConfigurationRequestSchema, ServiceConfigurationWriteResponseSchema } from "@spark/core";
import { CapabilityGuard, CurrentSupabaseUser, RequireCapability, SupabaseJwtGuard, type SupabaseJwtClaims } from "../../../auth/index.js";
import { GetCurrentUserUseCase } from "../../identity/application/get-current-user.usecase.js";
import { ServiceConfigurationRepository } from "../infrastructure/service-configuration.repository.js";
class SaveServiceConfigurationDto extends createZodDto(SaveServiceConfigurationRequestSchema) {}
class ServiceConfigurationWriteResponseDto extends createZodDto(ServiceConfigurationWriteResponseSchema) {}
@ApiTags("service-configuration")
@ApiBearerAuth()
@UseGuards(SupabaseJwtGuard, CapabilityGuard)
@RequireCapability("settings:manage")
@Controller("v1/service-configuration")
export class ServiceConfigurationController {
  constructor(private readonly users: GetCurrentUserUseCase, private readonly config: ServiceConfigurationRepository) {}
  @Post() @ApiOkResponse({ type: ServiceConfigurationWriteResponseDto })
  async save(@CurrentSupabaseUser() claims: SupabaseJwtClaims, @Body() body: SaveServiceConfigurationDto) {
    const user = await this.users.execute(claims.sub);
    return this.config.save(user.orgId, user.id, SaveServiceConfigurationSchema.parse(body.configuration));
  }
}
