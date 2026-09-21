import { Body, Controller, ForbiddenException, HttpCode, Param, Post, Req } from "@nestjs/common";
import { timingSafeEqual } from "node:crypto";
import { integrationConnectionId } from "@spark/core";
import type { RawBodyRequest } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { TelegramWebhookRepository } from "../infrastructure/telegram-webhook.repository.js";

@Controller("v1/webhooks/telegram")
export class TelegramWebhookController {
  constructor(private readonly webhooks: TelegramWebhookRepository) {}

  @Post(":connectionId")
  @HttpCode(200)
  async receive(@Param("connectionId") rawId: string, @Req() request: RawBodyRequest<FastifyRequest>, @Body() payload: unknown): Promise<{ received: true; inserted: number }> {
    const connection = await this.webhooks.connection(integrationConnectionId.from(rawId));
    const secret = request.headers["x-telegram-bot-api-secret-token"];
    if (typeof secret !== "string" || !sameSecret(secret, connection.secretToken)) throw new ForbiddenException("Assinatura ausente ou inválida.");
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
