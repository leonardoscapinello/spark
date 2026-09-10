import { createParamDecorator } from "@nestjs/common";
import type { ExecutionContext } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import type { SupabaseJwtClaims } from "./supabase-jwt.schema.js";

/**
 * Uso: `me(@CurrentSupabaseUser() claims: SupabaseJwtClaims)`. Só existe em
 * rota protegida por SupabaseJwtGuard — ele que popula `request.supabaseUser`.
 */
export const CurrentSupabaseUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): SupabaseJwtClaims => {
    const request = ctx.switchToHttp().getRequest<FastifyRequest>();
    if (!request.supabaseUser) {
      throw new Error("CurrentSupabaseUser usado fora de uma rota com SupabaseJwtGuard");
    }
    return request.supabaseUser;
  },
);
