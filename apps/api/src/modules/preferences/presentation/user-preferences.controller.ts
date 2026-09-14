import { BadRequestException, Body, Controller, Param, Put, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { UserPreferenceKeySchema } from "@spark/core";
import { CurrentSupabaseUser, SupabaseJwtGuard, type SupabaseJwtClaims } from "../../../auth/index.js";
import { GetCurrentUserUseCase } from "../../identity/application/get-current-user.usecase.js";
import { UpsertUserPreferenceDto, UserPreferenceWriteResponseDto } from "../dto/user-preference.dto.js";
import { UserPreferencesRepository } from "../infrastructure/user-preferences.repository.js";

/**
 * Preferência é do próprio usuário: qualquer pessoa autenticada grava a sua,
 * e só a sua (org e usuário vêm da sessão, nunca do corpo). Não há capacidade
 * a exigir além de estar logado — o guard de capacidade fica de fora de
 * propósito (ADR-0029: a regra vale para dado da organização).
 */
@ApiTags("preferences")
@ApiBearerAuth()
@UseGuards(SupabaseJwtGuard)
@Controller("v1/preferences")
export class UserPreferencesController {
  constructor(
    private readonly currentUser: GetCurrentUserUseCase,
    private readonly preferences: UserPreferencesRepository,
  ) {}

  @Put(":key")
  @ApiOkResponse({ type: UserPreferenceWriteResponseDto })
  async upsert(@CurrentSupabaseUser() claims: SupabaseJwtClaims, @Param("key") key: string, @Body() body: UpsertUserPreferenceDto) {
    const parsedKey = UserPreferenceKeySchema.safeParse(key);
    if (!parsedKey.success) throw new BadRequestException("Chave de preferência inválida — use o formato area.nome.");
    const user = await this.currentUser.execute(claims.sub);
    return this.preferences.upsert(user.orgId, user.id, parsedKey.data, body);
  }
}
