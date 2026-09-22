import { Body, Controller, ForbiddenException, HttpCode, Param, Post, Req } from "@nestjs/common";
import { timingSafeEqual } from "node:crypto";
import { integrationConnectionId } from "@spark/core";
import type { FastifyRequest } from "fastify";
import { PostmarkWebhookRepository } from "../infrastructure/postmark-webhook.repository.js";
import { WebhookQueue } from "../infrastructure/webhook-queue.service.js";

@Controller("v1/webhooks/postmark")
export class PostmarkWebhookController {
  constructor(private readonly webhooks: PostmarkWebhookRepository, private readonly queue: WebhookQueue) {}

  @Post(":connectionId")
  @HttpCode(200)
  async receive(@Param("connectionId") rawId: string, @Req() request: FastifyRequest, @Body() payload: unknown): Promise<{ received: true }> {
    const connection = await this.webhooks.connection(integrationConnectionId.from(rawId));
    const header = request.headers.authorization;
    if (typeof header !== "string" || !header.startsWith("Basic ")) throw new ForbiddenException("Autenticação ausente ou inválida.");
    const [user, pass] = Buffer.from(header.slice(6), "base64").toString("utf8").split(":");
    if (!sameSecret(user, connection.username) || !sameSecret(pass, connection.password)) throw new ForbiddenException("Autenticação ausente ou inválida.");
    // Assinatura já verificada — o resto (gravar) roda fora do request, na fila (ADR-0009).
    await this.queue.enqueue({ provider: "postmark", connectionId: rawId, payload });
    return { received: true };
  }
}

function sameSecret(actual: unknown, expected: string): boolean {
  if (typeof actual !== "string") return false;
  const left = Buffer.from(actual);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}
