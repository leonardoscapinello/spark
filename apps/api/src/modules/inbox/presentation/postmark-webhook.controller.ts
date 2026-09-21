import { Body, Controller, ForbiddenException, HttpCode, Param, Post, Req } from "@nestjs/common";
import { timingSafeEqual } from "node:crypto";
import { integrationConnectionId } from "@spark/core";
import type { FastifyRequest } from "fastify";
import { PostmarkWebhookRepository } from "../infrastructure/postmark-webhook.repository.js";

@Controller("v1/webhooks/postmark")
export class PostmarkWebhookController {
  constructor(private readonly webhooks: PostmarkWebhookRepository) {}

  @Post(":connectionId")
  @HttpCode(200)
  async receive(@Param("connectionId") rawId: string, @Req() request: FastifyRequest, @Body() payload: unknown): Promise<{ received: true; inserted: number }> {
    const connection = await this.webhooks.connection(integrationConnectionId.from(rawId));
    const header = request.headers.authorization;
    if (typeof header !== "string" || !header.startsWith("Basic ")) throw new ForbiddenException("Autenticação ausente ou inválida.");
    const [user, pass] = Buffer.from(header.slice(6), "base64").toString("utf8").split(":");
    if (!sameSecret(user, connection.username) || !sameSecret(pass, connection.password)) throw new ForbiddenException("Autenticação ausente ou inválida.");
    const inserted = await this.webhooks.receive(connection.orgId, payload);
    return { received: true, inserted };
  }
}

function sameSecret(actual: unknown, expected: string): boolean {
  if (typeof actual !== "string") return false;
  const left = Buffer.from(actual);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}
