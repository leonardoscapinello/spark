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
 * Verifica o JWT emitido pela Supabase Auth (Authorization: Bearer <jwt>).
 * Não implementa login — login é a Supabase Auth quem faz (e-mail/senha,
 * magic link, OAuth); aqui só confiamos e verificamos o token que ela já
 * emitiu (docs/adr/0005). HS256 com segredo compartilhado é o padrão da
 * Supabase Auth hoje; se o projeto migrar pra chave assimétrica (JWKS), só
 * este arquivo muda — nada no resto da API.
 */
@Injectable()
export class SupabaseJwtGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const header = request.headers.authorization;

    if (!header?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Token ausente");
    }

    const token = header.slice("Bearer ".length);
    const secret = this.config.getOrThrow<string>("SUPABASE_JWT_SECRET");

    try {
      const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
      request.supabaseUser = SupabaseJwtClaimsSchema.parse(payload);
      return true;
    } catch {
      throw new UnauthorizedException("Token inválido ou expirado");
    }
  }
}
