import { Body, Controller, ForbiddenException, Get, Header, HttpCode, Param, Post, Query, Req } from "@nestjs/common";
import { createHmac, timingSafeEqual } from "node:crypto";
import { integrationConnectionId } from "@spark/core";
import type { RawBodyRequest } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { InstagramWebhookRepository } from "../infrastructure/instagram-webhook.repository.js";
import { WebhookQueue } from "../infrastructure/webhook-queue.service.js";

@Controller("v1/webhooks/instagram")
export class InstagramWebhookController {
  constructor(private readonly webhooks: InstagramWebhookRepository, private readonly queue: WebhookQueue) {}

  @Get(":connectionId")
  @Header("Content-Type", "text/plain")
  async verify(@Param("connectionId") rawId: string, @Query("hub.mode") mode: string, @Query("hub.verify_token") token: string, @Query("hub.challenge") challenge: string): Promise<string> {
    const connection = await this.webhooks.connection(integrationConnectionId.from(rawId));
    if (mode !== "subscribe" || typeof challenge !== "string" || !sameSecret(token, connection.verifyToken)) throw new ForbiddenException("Verificação recusada.");
    return challenge;
  }

  @Post(":connectionId")
  @HttpCode(200)
  async receive(@Param("connectionId") rawId: string, @Req() request: RawBodyRequest<FastifyRequest>, @Body() payload: unknown): Promise<{ received: true }> {
    const connection = await this.webhooks.connection(integrationConnectionId.from(rawId));
    const signature = request.headers["x-hub-signature-256"];
    if (!Buffer.isBuffer(request.rawBody) || typeof signature !== "string" || !/^sha256=[a-f\d]{64}$/i.test(signature)) throw new ForbiddenException("Assinatura ausente ou inválida.");
    const expected = `sha256=${createHmac("sha256", connection.appSecret).update(request.rawBody).digest("hex")}`;
    if (!sameSecret(signature.toLowerCase(), expected)) throw new ForbiddenException("Assinatura ausente ou inválida.");
    // Assinatura já verificada — o resto (buscar mídia, gravar) roda fora do request, na fila (ADR-0009).
    await this.queue.enqueue({ provider: "instagram", connectionId: rawId, payload });
    return { received: true };
  }
}

function sameSecret(actual: unknown, expected: string): boolean {
  if (typeof actual !== "string") return false;
  const left = Buffer.from(actual);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}
