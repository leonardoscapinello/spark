import { Module } from "@nestjs/common";
import { SettingsModule } from "../settings/settings.module.js";
import { PipelinesController } from "./presentation/pipelines.controller.js";
import { StagesController } from "./presentation/stages.controller.js";
import { DealsController } from "./presentation/deals.controller.js";
import { CreatePipelineUseCase } from "./application/create-pipeline.usecase.js";
import { CreateStageUseCase } from "./application/create-stage.usecase.js";
import { RenameStageUseCase } from "./application/rename-stage.usecase.js";
import { CreateDealUseCase } from "./application/create-deal.usecase.js";
import { MoveDealUseCase } from "./application/move-deal.usecase.js";
import { CloseDealUseCase } from "./application/close-deal.usecase.js";
import { EditDealUseCase } from "./application/edit-deal.usecase.js";
import { ReopenDealUseCase } from "./application/reopen-deal.usecase.js";
import { ConfigureStageUseCase } from "./application/configure-stage.usecase.js";
import { ArchiveStageUseCase } from "./application/archive-stage.usecase.js";
import { ReorderStagesUseCase } from "./application/reorder-stages.usecase.js";
import { PipelinesRepository } from "./infrastructure/pipelines.repository.js";
import { StagesRepository } from "./infrastructure/stages.repository.js";
import { StageFieldRulesRepository } from "./infrastructure/stage-field-rules.repository.js";
import { StageFieldRulesController } from "./presentation/stage-field-rules.controller.js";
import { DealProductsRepository } from "./infrastructure/deal-products.repository.js";
import { DealProductsController } from "./presentation/deal-products.controller.js";
import { DealsRepository } from "./infrastructure/deals.repository.js";
import { GetCurrentUserUseCase } from "../identity/application/get-current-user.usecase.js";
import { UsersRepository } from "../identity/infrastructure/users.repository.js";
import { PermissionGroupsRepository } from "../identity/infrastructure/permission-groups.repository.js";
import { SupabaseJwtGuard, CapabilityGuard } from "../../auth/index.js";
import { EventsModule } from "../events/events.module.js";
import { DealPresenceService } from "./infrastructure/deal-presence.service.js";
import { DealPresenceController } from "./presentation/deal-presence.controller.js";
import { BusinessCalendarController } from "./presentation/business-calendar.controller.js";
import { BusinessCalendarRepository } from "./infrastructure/business-calendar.repository.js";
import { DealFollowersController } from "./presentation/deal-followers.controller.js";
import { DealFollowersRepository } from "./infrastructure/deal-followers.repository.js";

@Module({
  imports: [SettingsModule, EventsModule],
  controllers: [DealFollowersController, BusinessCalendarController, DealPresenceController, StageFieldRulesController, DealProductsController, PipelinesController, StagesController, DealsController],
  providers: [DealFollowersRepository, BusinessCalendarRepository, DealPresenceService, StageFieldRulesRepository, DealProductsRepository,
    CreatePipelineUseCase,
    CreateStageUseCase,
    RenameStageUseCase,
    CreateDealUseCase,
    MoveDealUseCase,
    CloseDealUseCase,
    EditDealUseCase,
    ReopenDealUseCase,
    ConfigureStageUseCase,
    ArchiveStageUseCase,
    ReorderStagesUseCase,
    PipelinesRepository,
    StagesRepository,
    DealsRepository,
    GetCurrentUserUseCase,
    UsersRepository,
    PermissionGroupsRepository,
    SupabaseJwtGuard,
    CapabilityGuard,
  ],
})
export class CrmModule {}
