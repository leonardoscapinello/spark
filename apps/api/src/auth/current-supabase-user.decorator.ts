import { createParamDecorator } from "@nestjs/common";
import type { ExecutionContext } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import type { SupabaseJwtClaims } from "./supabase-jwt.schema.js";

/**
 * Usage: `me(@CurrentSupabaseUser() claims: SupabaseJwtClaims)`. Only
 * exists on a route protected by SupabaseJwtGuard — it's what populates
 * `request.supabaseUser`.
 */
export const CurrentSupabaseUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): SupabaseJwtClaims => {
    const request = ctx.switchToHttp().getRequest<FastifyRequest>();
    if (!request.supabaseUser) {
      throw new Error("CurrentSupabaseUser used outside a route with SupabaseJwtGuard");
    }
    return request.supabaseUser;
  },
);
