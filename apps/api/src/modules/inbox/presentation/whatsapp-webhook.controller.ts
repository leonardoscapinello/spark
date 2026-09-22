import { Body, Controller, ForbiddenException, Get, Header, HttpCode, Param, Post, Query, Req } from "@nestjs/common";
import { createHmac, timingSafeEqual } from "node:crypto";
import { integrationConnectionId } from "@spark/core";
import type { RawBodyRequest } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { WhatsAppWebhookRepository } from "../infrastructure/whatsapp-webhook.repository.js";

@Controller("v1/webhooks/whatsapp")
export class WhatsAppWebhookController {
  constructor(private readonly webhooks: WhatsAppWebhookRepository) {}

  @Get(":connectionId")
  @Header("Content-Type", "text/plain")
  async verify(@Param("connectionId") rawId: string, @Query("hub.mode") mode: string, @Query("hub.verify_token") token: string, @Query("hub.challenge") challenge: string): Promise<string> {
    const connection = await this.webhooks.connection(integrationConnectionId.from(rawId));
    if (mode !== "subscribe" || typeof challenge !== "string" || !sameSecret(token, connection.verifyToken)) throw new ForbiddenException("Verificação recusada.");
    return challenge;
  }

  @Post(":connectionId")
  @HttpCode(200)
  async receive(@Param("connectionId") rawId: string, @Req() request: RawBodyRequest<FastifyRequest>, @Body() payload: unknown): Promise<{ received: true; inserted: number }> {
    const connection = await this.webhooks.connection(integrationConnectionId.from(rawId));
    const signature = request.headers["x-hub-signature-256"];
    if (!Buffer.isBuffer(request.rawBody) || typeof signature !== "string" || !/^sha256=[a-f\d]{64}$/i.test(signature)) throw new ForbiddenException("Assinatura ausente ou inválida.");
    const expected = `sha256=${createHmac("sha256", connection.appSecret).update(request.rawBody).digest("hex")}`;
    if (!sameSecret(signature.toLowerCase(), expected)) throw new ForbiddenException("Assinatura ausente ou inválida.");
    const inserted = await this.webhooks.receive(connection.orgId, payload, connection.phoneNumberId, connection.accessToken);
    return { received: true, inserted };
  }
}

function sameSecret(actual: unknown, expected: string): boolean {
  if (typeof actual !== "string") return false;
  const left = Buffer.from(actual);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}
