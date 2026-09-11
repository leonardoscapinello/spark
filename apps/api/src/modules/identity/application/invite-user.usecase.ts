import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  canUseVerifiedEmail,
  emailVerificationMessage,
  type AdminUser,
  type InviteUserInput,
  type OrgId,
  type UserId,
} from "@spark/core";
import { IDENTITY_ADMIN_GATEWAY, type IdentityAdminGateway } from "./identity-admin.gateway.js";
import { UsersRepository } from "../infrastructure/users.repository.js";
import { EmailVerificationService } from "../../email-verification/application/email-verification.service.js";

@Injectable()
export class InviteUserUseCase {
  constructor(
    @Inject(IDENTITY_ADMIN_GATEWAY) private readonly identityAdmin: IdentityAdminGateway,
    private readonly users: UsersRepository,
    private readonly emailVerification: EmailVerificationService,
  ) {}

  async execute(orgId: OrgId, actorUserId: UserId, input: InviteUserInput): Promise<AdminUser> {
    if (!(await this.users.groupExists(orgId, input.groupId))) {
      throw new NotFoundException("Permission group not found in this organization.");
    }
    if (await this.users.emailExists(orgId, input.email)) {
      throw new ConflictException("A user with this email already belongs to the organization.");
    }

    const verification = await this.emailVerification.verify(orgId, input.email);
    if (!canUseVerifiedEmail(verification.result)) {
      throw new BadRequestException(emailVerificationMessage(verification.result));
    }

    let identityUserId: string;
    try {
      identityUserId = await this.identityAdmin.invite(input.email, input.name);
    } catch {
      throw new BadGatewayException("The identity provider could not create the invitation.");
    }

    try {
      return await this.users.createInvited(orgId, actorUserId, input, identityUserId);
    } catch (error) {
      await this.identityAdmin.revoke(identityUserId);
      throw error;
    }
  }
}
