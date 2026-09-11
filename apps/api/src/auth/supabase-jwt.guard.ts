import { Injectable, UnauthorizedException } from "@nestjs/common";
import type { CanActivate, ExecutionContext } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { jwtVerify } from "jose";
import type { FastifyRequest } from "fastify";
import { SupabaseJwtClaimsSchema, type SupabaseJwtClaims } from "./supabase-jwt.schema.js";

declare module "fastify" {
  interface FastifyRequest {
    supabaseUser?: SupabaseJwtClaims;
  }
}

/**
 * Verifies the JWT issued by Supabase Auth (Authorization: Bearer <jwt>).
 * Doesn't implement login — Supabase Auth does that (email/password, magic
 * link, OAuth); this only trusts and verifies the token it already issued
 * (docs/adr/0005). HS256 with a shared secret is Supabase Auth's current
 * default; if the project ever moves to an asymmetric key (JWKS), only
 * this file changes — nothing else in the API.
 */
@Injectable()
export class SupabaseJwtGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const header = request.headers.authorization;

    if (!header?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing token");
    }

    const token = header.slice("Bearer ".length);
    const secret = this.config.getOrThrow<string>("SUPABASE_JWT_SECRET");

    try {
      const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
      request.supabaseUser = SupabaseJwtClaimsSchema.parse(payload);
      return true;
    } catch {
      throw new UnauthorizedException("Invalid or expired token");
    }
  }
}
