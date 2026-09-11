import { BadGatewayException, BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { AdminUser, OrgId, UserId } from "@spark/core";
import { IDENTITY_ADMIN_GATEWAY, type IdentityAdminGateway } from "./identity-admin.gateway.js";
import { UsersRepository } from "../infrastructure/users.repository.js";

@Injectable()
export class UpdateUserAccessUseCase {
  constructor(
    @Inject(IDENTITY_ADMIN_GATEWAY) private readonly identityAdmin: IdentityAdminGateway,
    private readonly users: UsersRepository,
  ) {}

  async execute(orgId: OrgId, actorUserId: UserId, targetUserId: UserId, active: boolean): Promise<AdminUser> {
    if (!active && actorUserId === targetUserId) {
      throw new BadRequestException("You cannot deactivate your own access.");
    }

    const target = await this.users.findById(orgId, targetUserId);
    if (!target) throw new NotFoundException("User not found in this organization.");

    try {
      await this.identityAdmin.setAccess(target.supabaseUserId, active);
    } catch {
      throw new BadGatewayException("The identity provider could not update user access.");
    }

    try {
      const updated = await this.users.updateAccess(orgId, actorUserId, targetUserId, active);
      if (!updated) throw new NotFoundException("User not found in this organization.");
      return updated;
    } catch (error) {
      await this.identityAdmin.setAccess(target.supabaseUserId, !active);
      throw error;
    }
  }
}
