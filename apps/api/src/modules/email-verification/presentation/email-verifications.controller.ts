import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import {
  CapabilityGuard,
  CurrentSupabaseUser,
  RequireCapability,
  SupabaseJwtGuard,
  type SupabaseJwtClaims,
} from "../../../auth/index.js";
import { GetCurrentUserUseCase } from "../../identity/application/get-current-user.usecase.js";
import { EmailVerificationService } from "../application/email-verification.service.js";
import { VerifyEmailDto, VerifyEmailResponseDto } from "../dto/email-verification.dto.js";

@ApiTags("email-verifications")
@Controller("v1/email-verifications")
@UseGuards(SupabaseJwtGuard, CapabilityGuard)
@RequireCapability("users:manage")
@ApiBearerAuth()
export class EmailVerificationsController {
  constructor(
    private readonly currentUser: GetCurrentUserUseCase,
    private readonly verifier: EmailVerificationService,
  ) {}

  @Post()
  @ApiOkResponse({ type: VerifyEmailResponseDto })
  async verify(
    @CurrentSupabaseUser() claims: SupabaseJwtClaims,
    @Body() body: VerifyEmailDto,
  ): Promise<VerifyEmailResponseDto> {
    const user = await this.currentUser.execute(claims.sub);
    return this.verifier.verify(user.orgId, body.email) as Promise<VerifyEmailResponseDto>;
  }
}
