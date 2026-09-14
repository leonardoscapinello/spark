import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { CurrentSupabaseUser, SupabaseJwtGuard, type SupabaseJwtClaims } from "../../../auth/index.js";
import { GetCurrentUserUseCase } from "../../identity/application/get-current-user.usecase.js";
import { ResolveLinkPreviewUseCase } from "../application/resolve-link-preview.usecase.js";
import { ResolveLinkPreviewDto, ResolveLinkPreviewResponseDto } from "../dto/link-preview.dto.js";

@ApiTags("link-previews")
@ApiBearerAuth()
@UseGuards(SupabaseJwtGuard)
@Controller("v1/link-previews")
export class LinkPreviewsController {
  constructor(private readonly currentUser: GetCurrentUserUseCase, private readonly resolvePreview: ResolveLinkPreviewUseCase) {}

  @Post("resolve")
  @ApiOkResponse({ type: ResolveLinkPreviewResponseDto })
  async resolve(@CurrentSupabaseUser() claims: SupabaseJwtClaims, @Body() body: ResolveLinkPreviewDto): Promise<ResolveLinkPreviewResponseDto> {
    const user = await this.currentUser.execute(claims.sub);
    return this.resolvePreview.execute(user.orgId, body.url) as Promise<ResolveLinkPreviewResponseDto>;
  }
}
