import { Module } from "@nestjs/common";
import { SupabaseJwtGuard } from "../../auth/index.js";
import { GetCurrentUserUseCase } from "../identity/application/get-current-user.usecase.js";
import { UsersRepository } from "../identity/infrastructure/users.repository.js";
import { ResolveLinkPreviewUseCase } from "./application/resolve-link-preview.usecase.js";
import { LinkMetadataFetcher } from "./infrastructure/link-metadata-fetcher.js";
import { LinkPreviewsRepository } from "./infrastructure/link-previews.repository.js";
import { LinkPreviewsController } from "./presentation/link-previews.controller.js";

@Module({
  controllers: [LinkPreviewsController],
  providers: [ResolveLinkPreviewUseCase, LinkMetadataFetcher, LinkPreviewsRepository, GetCurrentUserUseCase, UsersRepository, SupabaseJwtGuard],
})
export class LinkPreviewsModule {}
