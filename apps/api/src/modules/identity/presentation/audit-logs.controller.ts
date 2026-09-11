import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { CapabilityGuard, CurrentSupabaseUser, RequireCapability, SupabaseJwtGuard, type SupabaseJwtClaims } from "../../../auth/index.js";
import { GetCurrentUserUseCase } from "../application/get-current-user.usecase.js";
import { AdminAuditLogDto } from "../dto/user.dto.js";
import { AuditLogsRepository } from "../infrastructure/audit-logs.repository.js";

@ApiTags("identity")
@Controller("v1/admin/audit-logs")
@UseGuards(SupabaseJwtGuard, CapabilityGuard)
@RequireCapability("audit_logs:read")
@ApiBearerAuth()
export class AuditLogsController {
  constructor(private readonly currentUser: GetCurrentUserUseCase, private readonly auditLogs: AuditLogsRepository) {}

  @Get()
  @ApiOkResponse({ type: AdminAuditLogDto, isArray: true })
  async list(@CurrentSupabaseUser() claims: SupabaseJwtClaims): Promise<AdminAuditLogDto[]> {
    const actor = await this.currentUser.execute(claims.sub);
    return await this.auditLogs.listByOrg(actor.orgId) as AdminAuditLogDto[];
  }
}
