import { ForbiddenException, Injectable } from "@nestjs/common";
import type { CanActivate, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { FastifyRequest } from "fastify";
import { temCapacidade, type Capacidade } from "@spark/core";
import { CAPACIDADE_EXIGIDA_KEY } from "./require-capability.decorator.js";
import { GetCurrentUserUseCase } from "../modules/identity/application/get-current-user.usecase.js";
import { PermissionGroupsRepository } from "../modules/identity/infrastructure/permission-groups.repository.js";

/**
 * Autoritativa (docs/adr/0029) — o cliente só esconde botão, quem decide é
 * aqui. Roda DEPOIS de SupabaseJwtGuard na lista de @UseGuards — depende
 * de request.supabaseUser já preenchido.
 *
 * Rota sem @RequireCapability nega por padrão: não é caso de borda, é a
 * regra ("quem não declara, nega por padrão").
 */
@Injectable()
export class CapabilityGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly getCurrentUser: GetCurrentUserUseCase,
    private readonly permissionGroups: PermissionGroupsRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const capacidadeExigida = this.reflector.getAllAndOverride<Capacidade | undefined>(CAPACIDADE_EXIGIDA_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!capacidadeExigida) {
      throw new ForbiddenException("Rota sem capacidade declarada.");
    }

    const request = context.switchToHttp().getRequest<FastifyRequest>();
    if (!request.supabaseUser) {
      throw new ForbiddenException("Sem usuário autenticado.");
    }

    const usuario = await this.getCurrentUser.execute(request.supabaseUser.sub);
    const grupos = await this.permissionGroups.buscarCapacidadesDoUsuario(usuario.id);

    if (!temCapacidade(grupos, capacidadeExigida)) {
      throw new ForbiddenException(`Sem a capacidade "${capacidadeExigida}".`);
    }

    return true;
  }
}
