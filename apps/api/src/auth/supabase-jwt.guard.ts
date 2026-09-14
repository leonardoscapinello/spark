import { Injectable, UnauthorizedException } from "@nestjs/common";
import type { CanActivate, ExecutionContext } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";
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
 * (docs/adr/0005). Cloud tokens use the project's asymmetric signing key
 * through JWKS. Tests keep an isolated HS256 key so they never depend on
 * an external identity provider.
 */
@Injectable()
export class SupabaseJwtGuard implements CanActivate {
  private jwks?: JWTVerifyGetKey;

  constructor(private readonly config: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const header = request.headers.authorization;

    if (!header?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing token");
    }

    const token = header.slice("Bearer ".length);
    try {
      const verificationMode = this.config.get<string>("SUPABASE_JWT_VERIFICATION");
      const isIsolatedTest = this.config.get<string>("NODE_ENV") === "test";
      const jwksUrl = verificationMode === "jwks" && !isIsolatedTest
        ? this.config.getOrThrow<string>("SUPABASE_JWKS_URL")
        : undefined;
      const verificationKey = jwksUrl
        ? (this.jwks ??= createRemoteJWKSet(new URL(jwksUrl)))
        : new TextEncoder().encode(this.config.getOrThrow<string>("SUPABASE_JWT_SECRET"));
      const issuer = jwksUrl
        ? this.config.getOrThrow<string>("SUPABASE_AUTH_ISSUER")
        : undefined;
      const { payload } = await jwtVerify(token, verificationKey, {
        ...(issuer ? { issuer } : {}),
        ...(jwksUrl ? { audience: "authenticated" } : {}),
      });
      request.supabaseUser = SupabaseJwtClaimsSchema.parse(payload);
      return true;
    } catch {
      throw new UnauthorizedException("Invalid or expired token");
    }
  }
}
