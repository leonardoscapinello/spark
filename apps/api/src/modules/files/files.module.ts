import { Module } from "@nestjs/common";
import { CapabilityGuard, SupabaseJwtGuard } from "../../auth/index.js";
import { EventsModule } from "../events/events.module.js";
import { GetCurrentUserUseCase } from "../identity/application/get-current-user.usecase.js";
import { PermissionGroupsRepository } from "../identity/infrastructure/permission-groups.repository.js";
import { UsersRepository } from "../identity/infrastructure/users.repository.js";
import { IntegrationsModule } from "../integrations/integrations.module.js";
import { CompleteFileUploadUseCase } from "./application/complete-file-upload.usecase.js";
import { CreateFileUploadUseCase } from "./application/create-file-upload.usecase.js";
import { DeleteFileUseCase } from "./application/delete-file.usecase.js";
import { GetFileDownloadUseCase } from "./application/get-file-download.usecase.js";
import { FilesRepository } from "./infrastructure/files.repository.js";
import { StorageResolver } from "./infrastructure/storage-resolver.service.js";
import { FilesController } from "./presentation/files.controller.js";
@Module({ imports: [EventsModule, IntegrationsModule], controllers: [FilesController], providers: [CreateFileUploadUseCase, CompleteFileUploadUseCase, GetFileDownloadUseCase, DeleteFileUseCase, FilesRepository, StorageResolver, GetCurrentUserUseCase, UsersRepository, PermissionGroupsRepository, SupabaseJwtGuard, CapabilityGuard] })
export class FilesModule {}
