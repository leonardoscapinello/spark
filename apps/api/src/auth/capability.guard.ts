import { ForbiddenException, Injectable } from "@nestjs/common";
import type { CanActivate, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { FastifyRequest } from "fastify";
import { hasCapability, effectiveCapabilities, canReadSyncResource, type SyncResource, type Capability } from "@spark/core";
import { REQUIRED_CAPABILITY_KEY, REQUIRED_RESOURCE_KEY } from "./require-capability.decorator.js";
import { GetCurrentUserUseCase } from "../modules/identity/application/get-current-user.usecase.js";
import { PermissionGroupsRepository } from "../modules/identity/infrastructure/permission-groups.repository.js";

/**
 * Authoritative (docs/adr/0029) — the client only hides the button, this is
 * what decides. Runs AFTER SupabaseJwtGuard in the @UseGuards list — it
 * depends on request.supabaseUser already being populated.
 *
 * A route with no @RequireCapability denies by default: not an edge case,
 * it's the rule ("whoever doesn't declare, gets denied by default").
 */
@Injectable()
export class CapabilityGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly getCurrentUser: GetCurrentUserUseCase,
    private readonly permissionGroups: PermissionGroupsRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredCapability = this.reflector.getAllAndOverride<Capability | undefined>(REQUIRED_CAPABILITY_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const requiredResource = this.reflector.getAllAndOverride<SyncResource | undefined>(REQUIRED_RESOURCE_KEY, [context.getHandler(), context.getClass()]);

    if (!requiredCapability && !requiredResource) {
      throw new ForbiddenException("Route has no declared capability.");
    }

    const request = context.switchToHttp().getRequest<FastifyRequest>();
    if (!request.supabaseUser) {
      throw new ForbiddenException("No authenticated user.");
    }

    const user = await this.getCurrentUser.execute(request.supabaseUser.sub);
    const groups = await this.permissionGroups.getUserCapabilities(user.id);

    if ((requiredCapability && !hasCapability(groups, requiredCapability))
      || (requiredResource && !canReadSyncResource(effectiveCapabilities(groups), requiredResource))) {
      throw new ForbiddenException("Missing access to the requested resource.");
    }

    return true;
  }
}
